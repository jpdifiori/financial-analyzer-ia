"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type VariableExpense = {
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
    expense_type?: string;
};

export function VariableExpenses({ selectedMonth, setSelectedMonth }: { selectedMonth: string, setSelectedMonth?: (month: string) => void }) {
    const [expenses, setExpenses] = useState<VariableExpense[]>([]);
    const [viewYear, setViewYear] = useState(parseInt(selectedMonth.split('-')[0]));

    // Update view year when selected month changes externally
    useEffect(() => {
        setViewYear(parseInt(selectedMonth.split('-')[0]));
    }, [selectedMonth]);
    const [loading, setLoading] = useState(true);
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(selectedMonth + '-01');
    const [category, setCategory] = useState("General");
    const [expenseType, setExpenseType] = useState("Efectivo");

    // [New Code] State for Scanning
    const [isScanning, setIsScanning] = useState(false);
    const [scannedItems, setScannedItems] = useState<VariableExpense[]>([]);
    const [showReview, setShowReview] = useState(false);
    const [debugLog, setDebugLog] = useState<string | null>(null); // New Debug State

    const [calendarMarkers, setCalendarMarkers] = useState<Record<string, { closing?: string, payment?: string }>>({});

    useEffect(() => {
        fetchExpenses();
        fetchCalendarMarkers();
        setDate(selectedMonth + '-01');
    }, [selectedMonth]);

    const fetchCalendarMarkers = async () => {
        // Fetch all analyses to find dates for various months
        // We only need summary to get dates
        const { data } = await supabase
            .from("analyses")
            .select("summary")
            .order("created_at", { ascending: false });

        if (data) {
            const markers: Record<string, { closing?: string, payment?: string }> = {};

            data.forEach((a: any) => {
                const s = a.summary;
                if (!s) return;

                // Extract Closing Date
                if (s.closing_date) {
                    // closing_date format YYYY-MM-DD
                    const [y, m, d] = s.closing_date.split('-');
                    const key = `${y}-${m}`; // Key by YYYY-MM
                    if (!markers[key]) markers[key] = {};
                    markers[key].closing = d;
                }

                // Extract Payment/Due Date
                // Usually payment_date is when user paid, which is close to due date.
                // If we want "Vencimiento", strictly we might need it from AI.
                // Assuming payment_date is a good proxy for now if extracted.
                if (s.payment_date) {
                    const [y, m, d] = s.payment_date.split('-');
                    const key = `${y}-${m}`;
                    if (!markers[key]) markers[key] = {};
                    markers[key].payment = d;
                }
            });
            setCalendarMarkers(markers);
        }
    };

    const fetchExpenses = async () => {
        const startDate = `${selectedMonth}-01`;
        const endDate = `${selectedMonth}-31`;

        const { data, error } = await supabase
            .from("variable_expenses")
            .select("*")
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: false });

        if (error) console.error("Error fetching variable expenses:", error);
        else setExpenses(data || []);
        setLoading(false);
    };

    const addExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !date) return;

        const { data, error } = await supabase
            .from("variable_expenses")
            .insert([{
                description,
                amount: parseFloat(amount),
                date,
                category,
                expense_type: expenseType,
                user_id: (await supabase.auth.getUser()).data.user?.id
            }])
            .select();

        if (error) {
            console.error("Error adding expense:", error);
            toast.error("Error al guardar");
        } else {
            setExpenses([data[0], ...expenses]);
            setDescription("");
            setAmount("");
            setDate("");
            setCategory("General");
            setExpenseType("Efectivo");
            toast.success("Gasto registrado");
        }
    };

    const deleteExpense = async (id: string) => {
        try {
            const { error } = await supabase
                .from("variable_expenses")
                .delete()
                .eq("id", id);

            if (error) throw error;
            setExpenses(expenses.filter((e) => e.id !== id));
            toast.success("Gasto eliminado");
        } catch (error: any) {
            console.error("Error deleting expense:", error);
            toast.error("Error al eliminar");
        }
    };

    // [New Code] File Handling with Auto-Conversion
    const handleFileSelect = async (file: File | null) => {
        if (!file) return;
        setIsScanning(true);
        setShowReview(true);
        setDebugLog(null);

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
                        // Force JPEG quality 0.8
                        resolve(canvas.toDataURL("image/jpeg", 0.8));
                    };
                    img.onerror = (err) => reject(err);
                    img.src = URL.createObjectURL(file);
                } else {
                    // Fallback for PDFs or non-images (though convert logic implies images)
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = (err) => reject(err);
                    reader.readAsDataURL(file);
                }
            });

            // 2. Send to API
            // Get session for basic auth check
            const { data: { session } } = await supabase.auth.getSession();
            const storedSessionId = localStorage.getItem("stripe_session_id") || "free_tier";

            const res = await fetch("/api/analyze-receipt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pdfBase64: base64, sessionId: storedSessionId })
            });

            const rawText = await res.text();
            console.log("Raw API Response:", rawText);

            let data;
            try {
                data = JSON.parse(rawText);
                // setDebugLog(JSON.stringify(data, null, 2)); // Optional Debug
            } catch (e) {
                setDebugLog(`Error parsing JSON: ${e} \nRaw: ${rawText}`);
                throw new Error("Invalid JSON response");
            }

            if (data.items && Array.isArray(data.items)) {
                const mappedItems = data.items.map((item: any, idx: number) => ({
                    id: `temp-${idx}`, // Temp ID
                    description: item.description,
                    amount: item.amount,
                    date: item.date,
                    category: item.category || "General"
                }));
                setScannedItems(mappedItems);
            } else {
                toast.error(`Error: ${data.error || "No se detectaron items"}`);
                setShowReview(false);
            }
            setIsScanning(false);

        } catch (e: any) {
            console.error(e);
            toast.error(`Error analizando el archivo: ${e.message}`);
            setIsScanning(false);
            setShowReview(false);
        }
    };

    const confirmImport = async () => {
        if (scannedItems.length === 0) return;

        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        const itemsToInsert = scannedItems.map(item => ({
            user_id: user.id,
            description: item.description,
            amount: item.amount,
            date: item.date,
            category: item.category
        }));

        const { data, error } = await supabase
            .from("variable_expenses")
            .insert(itemsToInsert)
            .select();

        if (error) {
            console.error("Error importing items:", error);
            toast.error("Error al importar gastos.");
        } else {
            setExpenses([...(data || []), ...expenses]);
            setScannedItems([]);
            setShowReview(false);
            toast.success("¡Gastos importados correctamente!");
        }
    };

    const removeScannedItem = (idx: number) => {
        setScannedItems(scannedItems.filter((_, i) => i !== idx));
    };

    const totalVariable = expenses.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Main Input Card - Aurora UI */}
            <div className="bg-slate-950/50 border border-white/10 rounded-[32px] p-8 lg:p-10 shadow-2xl relative overflow-hidden group backdrop-blur-xl">
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h3 className="text-3xl font-serif text-pink-400 italic tracking-tight flex items-center gap-3">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-400">
                                    Gastos Variables
                                </span>
                            </h3>
                            <div className="flex items-center gap-3 mt-2">
                                <p className="text-slate-400 text-sm font-mono uppercase tracking-wider">
                                    {new Date(selectedMonth + '-02').toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                                </p>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                                        disabled={isScanning}
                                    />
                                    <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider text-pink-300 hover:text-white hover:bg-pink-500/20 bg-pink-500/10 rounded-full border border-pink-500/20 transition-all" disabled={isScanning}>
                                        {isScanning ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Plus className="mr-2 h-3 w-3" />}
                                        {isScanning ? "Escaneando..." : "Escanear Ticket"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        {/* Monthly Total Pill */}
                        <div className="bg-slate-900/50 rounded-2xl p-5 flex flex-col items-end border border-white/10 shadow-[0_0_20px_rgba(236,72,153,0.1)] backdrop-blur-md group-hover:border-pink-500/30 transition-all">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Total Variables</span>
                            <span className="text-3xl font-mono font-black text-white drop-shadow-lg">
                                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(totalVariable)}
                            </span>
                        </div>
                    </div>

                    {/* Review Section */}
                    {showReview && (
                        <div className="mb-8 p-6 bg-slate-900/80 border border-pink-500/30 rounded-2xl animate-in fade-in zoom-in duration-300 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-rose-500 animate-pulse" />
                            <h3 className="text-xs font-black text-pink-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-pink-500 animate-ping" />
                                Items Detectados ({scannedItems.length})
                            </h3>

                            {isScanning ? (
                                <div className="text-center py-10">
                                    <Loader2 className="h-10 w-10 animate-spin text-pink-500 mx-auto mb-4" />
                                    <p className="text-slate-300 font-mono text-xs tracking-widest uppercase">Procesando con IA...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2 mb-6 scrollbar-thin scrollbar-thumb-pink-900/50 scrollbar-track-transparent">
                                        {scannedItems.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 hover:border-pink-500/30 transition-all group/item">
                                                <div className="flex-1">
                                                    <p className="font-serif italic text-slate-200 text-sm group-hover/item:text-pink-300 transition-colors">{item.description}</p>
                                                    <div className="flex gap-2 text-[10px] uppercase font-bold text-slate-500 mt-1">
                                                        <span className="bg-black/30 px-2 py-0.5 rounded border border-white/5">{item.date}</span>
                                                        <span className="bg-pink-500/10 text-pink-300 px-2 py-0.5 rounded border border-pink-500/20">{item.category}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-mono font-bold text-white">${item.amount.toLocaleString()}</span>
                                                    <button onClick={() => removeScannedItem(idx)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {scannedItems.length === 0 && <p className="text-xs text-center py-6 text-slate-500 font-mono uppercase tracking-widest">No hay items válidos.</p>}
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                        <Button variant="ghost" onClick={() => { setShowReview(false); setScannedItems([]); }} className="text-slate-400 text-xs font-bold hover:text-white hover:bg-white/10">
                                            CANCELAR
                                        </Button>
                                        <Button size="sm" onClick={confirmImport} disabled={scannedItems.length === 0} className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.4)] text-xs font-bold px-6 tracking-wider border border-white/10">
                                            CONFIRMAR
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <form onSubmit={addExpense} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <div className="md:col-span-2 space-y-2">
                            <input
                                placeholder="Descripción (ej: Cena con amigos)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:border-pink-500/50 focus:bg-white/10 transition-all font-serif italic outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <input
                                type="number"
                                placeholder="Monto"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono font-bold placeholder:text-slate-600 focus:border-pink-500/50 focus:bg-white/10 transition-all outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-slate-300 font-mono placeholder:text-slate-600 focus:border-pink-500/50 focus:bg-white/10 transition-all outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-slate-300 font-mono cursor-pointer focus:border-pink-500/50 focus:bg-white/10 transition-all outline-none appearance-none"
                            >
                                <option value="General" className="bg-slate-900">General</option>
                                <option value="Supermercado" className="bg-slate-900">Supermercado</option>
                                <option value="Comida" className="bg-slate-900">Comida</option>
                                <option value="Servicios" className="bg-slate-900">Servicios</option>
                                <option value="Transporte" className="bg-slate-900">Transporte</option>
                                <option value="Entretenimiento" className="bg-slate-900">Entretenimiento</option>
                                <option value="Salud" className="bg-slate-900">Salud</option>
                                <option value="Educación" className="bg-slate-900">Educación</option>
                                <option value="Ropa" className="bg-slate-900">Ropa</option>
                                <option value="Hogar" className="bg-slate-900">Hogar</option>
                                <option value="Otros" className="bg-slate-900">Otros</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <select
                                value={expenseType}
                                onChange={(e) => setExpenseType(e.target.value)}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-slate-300 font-mono cursor-pointer focus:border-pink-500/50 focus:bg-white/10 transition-all outline-none appearance-none"
                            >
                                <option value="Efectivo" className="bg-slate-900">Efectivo</option>
                                <option value="Débito" className="bg-slate-900">Débito</option>
                                <option value="Transferencia" className="bg-slate-900">Transferencia</option>
                                <option value="QR" className="bg-slate-900">QR / Billetera</option>
                            </select>
                        </div>

                        <div className="md:col-span-6 flex justify-end pt-4 border-t border-white/5 mt-2">
                            <Button type="submit" className="w-full md:w-auto bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl px-8 py-6 shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-transform hover:scale-[1.02] uppercase font-black tracking-widest text-xs border border-white/10">
                                <Plus className="mr-2 h-4 w-4" /> Agregar Gasto
                            </Button>
                        </div>
                    </form>
                </div>
                {/* Aurora Blob */}
                <div className="absolute -top-24 -right-24 h-64 w-64 bg-pink-500/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-pink-500/30 transition-all duration-700" />
                <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-purple-500/30 transition-all duration-700" />
            </div>

            {/* Horizontal Annual Calendar */}
            <div className="relative">
                <div className="flex items-center justify-between mb-6 px-2">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        Calendario <span className="text-pink-500 text-lg">•</span> {viewYear}
                    </h4>
                    <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1 border border-white/5">
                        <button
                            onClick={() => setViewYear(prev => prev - 1)}
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-md transition-all"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="font-mono font-bold text-slate-300 text-sm px-2">{viewYear}</span>
                        <button
                            onClick={() => setViewYear(prev => prev + 1)}
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-md transition-all"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="bg-slate-950/30 border-y border-white/5 backdrop-blur-sm p-4 mb-8 overflow-x-auto scrollbar-hide -mx-4 md:mx-0 md:rounded-2xl md:border">
                    <div className="flex items-center gap-4 min-w-max px-2">
                        {Array.from({ length: 12 }, (_, i) => {
                            const monthNum = i + 1;
                            const monthStr = `${viewYear}-${monthNum.toString().padStart(2, '0')}`;
                            const isSelected = selectedMonth === monthStr;

                            // Check for Card Dates
                            const marker = calendarMarkers[monthStr];

                            return (
                                <button
                                    key={monthNum}
                                    onClick={() => setSelectedMonth?.(monthStr)}
                                    className={`
                                        relative group flex flex-col items-center justify-center min-w-[70px] h-[100px] rounded-2xl border transition-all duration-300
                                        ${isSelected
                                            ? 'bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.2)]'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                        }
                                    `}
                                >
                                    <span className={`text-[9px] uppercase font-black tracking-widest mb-1 ${isSelected ? 'text-pink-300' : 'text-slate-500'}`}>
                                        {new Date(2024, i, 1).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                                    </span>
                                    <span className={`text-lg font-mono font-bold ${isSelected ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'}`}>
                                        {monthNum.toString().padStart(2, '0')}
                                    </span>

                                    {/* Markers */}
                                    <div className="mt-2 text-[8px] font-mono flex flex-col items-center gap-1 w-full px-1">
                                        {marker?.closing && (
                                            <div className="w-full bg-pink-500/20 text-pink-300 rounded px-1 py-0.5 border border-pink-500/30 text-center truncate">
                                                Cie: {marker.closing}
                                            </div>
                                        )}
                                        {marker?.payment && (
                                            <div className="w-full bg-blue-500/20 text-blue-300 rounded px-1 py-0.5 border border-blue-500/30 text-center truncate">
                                                Ven: {marker.payment}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] pl-4">Historial de Gastos</h4>

                {loading ? (
                    <div className="text-center p-12"><Loader2 className="animate-spin h-8 w-8 text-pink-500 mx-auto" /></div>
                ) : (
                    <div className="grid gap-3">
                        {expenses.map((expense) => (
                            <div key={expense.id} className="group flex justify-between items-center p-5 bg-slate-900/40 border border-white/5 rounded-[24px] hover:bg-slate-900/60 hover:border-white/20 transition-all duration-300 backdrop-blur-md relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-pink-500/0 group-hover:bg-pink-500 transition-all duration-300" />
                                <div>
                                    <p className="font-serif italic text-lg text-slate-200 group-hover:text-pink-300 transition-colors mb-1">{expense.description}</p>
                                    <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold text-slate-500">
                                        <span className="bg-black/20 px-2 py-1 rounded-lg border border-white/5">{expense.date}</span>
                                        <span className="bg-pink-500/10 text-pink-400 px-2 py-1 rounded-lg border border-pink-500/20">{expense.category || "General"}</span>
                                        {expense.expense_type && (
                                            <span className="bg-blue-500/10 text-blue-300 px-2 py-1 rounded-lg border border-blue-500/20">{expense.expense_type}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className="font-mono font-bold text-xl text-white drop-shadow-md">
                                        -${expense.amount.toLocaleString()}
                                    </span>
                                    <button onClick={() => deleteExpense(expense.id)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {expenses.length === 0 && (
                            <div className="bg-slate-900/40 rounded-[24px] p-12 text-center border border-white/5 border-dashed">
                                <p className="text-slate-500 font-mono text-sm">No hay gastos variables en este período.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
