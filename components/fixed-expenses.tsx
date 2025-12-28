"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";

type FixedExpense = {
    id: string;
    description: string;
    amount: number;
    currency: string;
    due_day: number;
    category: string;
    type: string;
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

export function FixedExpenses() {
    const [expenses, setExpenses] = useState<FixedExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDay, setDueDay] = useState("");
    const [category, setCategory] = useState("Vivienda");
    const [type, setType] = useState("Esencial");

    // States for Scanning (Reused concept from VariableExpenses)
    const [isScanning, setIsScanning] = useState(false);
    const [scannedItems, setScannedItems] = useState<ScannedFixedItem[]>([]);
    const [showReview, setShowReview] = useState(false);

    useEffect(() => {
        fetchExpenses();
    }, []);

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
                user_id: (await supabase.auth.getUser()).data.user?.id
            }])
            .select();

        if (error) {
            console.error("Error adding expense:", error);
            alert("Error al guardar");
        } else {
            setExpenses([data[0], ...expenses]);
            setDescription("");
            setAmount("");
            setDueDay("");
            // Keep category/type as is for faster entry or reset? Let's reset to defaults.
            setCategory("Vivienda");
            setType("Esencial");
        }
    };

    const deleteExpense = async (id: string) => {
        const { error } = await supabase
            .from("fixed_expenses")
            .delete()
            .eq("id", id);

        if (error) console.error("Error deleting expense:", error);
        else setExpenses(expenses.filter((e) => e.id !== id));
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
                const mappedItems = data.items.map((item: any, idx: number) => {
                    const dateObj = item.date ? new Date(item.date) : new Date();
                    // Fallback to today's day if date is invalid
                    const detectedDay = isNaN(dateObj.getDate()) ? new Date().getDate() : dateObj.getDate();

                    return {
                        id: `temp-${idx}`,
                        description: item.description,
                        amount: item.amount,
                        due_day: detectedDay,
                        category: mapCategoryForward(item.category || "General")
                    };
                });
                setScannedItems(mappedItems);
            } else {
                alert(`No se detectaron datos válidos: ${data.error || 'Error desconocido'}`);
                setShowReview(false);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Error al escanear: ${e.message}`);
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
            alert("Error al guardar los gastos.");
        } else {
            setExpenses([...(data || []), ...expenses]);
            setScannedItems([]);
            setShowReview(false);
            alert("¡Gastos fijos importados!");
        }
    };

    const removeScannedItem = (idx: number) => {
        setScannedItems(scannedItems.filter((_, i) => i !== idx));
    };

    const totalFixed = expenses.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2 text-slate-900">
                        <span className="text-orange-600">Gastos Fijos</span> Mensuales
                    </CardTitle>
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/* .pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                            disabled={isScanning}
                        />
                        <Button variant="outline" size="sm" className="border-orange-200 text-orange-700 hover:bg-orange-50" disabled={isScanning}>
                            {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            {isScanning ? "Analizando..." : "Escanear Factura"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Review Section (Reused concept) */}
                    {showReview && (
                        <div className="mb-8 p-6 bg-orange-50 border border-orange-200 rounded-2xl animate-in fade-in zoom-in duration-300">
                            <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                                <span className="bg-orange-200 p-1.5 rounded-lg text-xl">🧾</span>
                                Facturas Detectadas ({scannedItems.length})
                            </h3>

                            {isScanning ? (
                                <div className="text-center py-10">
                                    <Loader2 className="h-10 w-10 animate-spin text-orange-600 mx-auto mb-4" />
                                    <p className="text-orange-600 font-medium animate-pulse">Analizando componentes de la factura con IA...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2 mb-6 scrollbar-hide">
                                        {scannedItems.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-xl border border-orange-100 shadow-sm group">
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-900">{item.description}</p>
                                                    <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                                        <span className="flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                                            📅 Día {item.due_day}
                                                        </span>
                                                        <span className="flex items-center gap-1 font-medium bg-orange-100 px-2 py-0.5 rounded text-orange-700">
                                                            🏷️ {item.category}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold text-lg text-slate-900">${item.amount.toLocaleString()}</span>
                                                    <button
                                                        onClick={() => removeScannedItem(idx)}
                                                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {scannedItems.length === 0 && (
                                            <p className="text-sm text-center py-6 text-slate-500 italic">No se pudieron extraer datos legibles. Reintenta con otra foto.</p>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-orange-200">
                                        <Button variant="ghost" onClick={() => { setShowReview(false); setScannedItems([]); }} className="text-slate-600">
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={confirmImport}
                                            disabled={scannedItems.length === 0}
                                            className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20"
                                        >
                                            Guardar en Gastos Fijos
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <form onSubmit={addExpense} className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Descripción</label>
                            <input
                                placeholder="Ej. Alquiler"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Monto</label>
                            <input
                                type="number"
                                placeholder="$0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Día Pago</label>
                            <input
                                type="number"
                                placeholder="1-31"
                                value={dueDay}
                                onChange={(e) => setDueDay(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                max={31}
                                min={1}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Categoría</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none bg-white"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Tipo</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none bg-white"
                            >
                                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-6 flex justify-end mt-2">
                            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white w-full md:w-auto">
                                <Plus className="mr-2 h-4 w-4" /> Agregar Gasto
                            </Button>
                        </div>
                    </form>

                    {loading ? (
                        <div className="text-center p-8"><Loader2 className="animate-spin h-8 w-8 text-orange-600 mx-auto" /></div>
                    ) : (
                        <div>
                            <div className="bg-slate-900 text-white p-4 rounded-xl mb-6 flex justify-between items-center shadow-lg shadow-slate-900/10">
                                <span className="text-slate-400 font-medium">Total Estimado Mensual</span>
                                <span className="text-2xl font-bold text-orange-500">${totalFixed.toLocaleString()}</span>
                            </div>
                            <div className="grid gap-3">
                                {expenses.map((expense) => (
                                    <div key={expense.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-shadow group">
                                        <div className="flex items-center gap-4 mb-2 md:mb-0">
                                            <div className="p-2 bg-orange-50 rounded-lg text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                                <span className="font-bold text-lg">{expense.due_day}</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{expense.description}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                                                        {expense.category || "General"}
                                                    </span>
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${expense.type === 'Esencial' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                        expense.type === 'Lujo' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                            'bg-blue-50 text-blue-700 border-blue-100'
                                                        }`}>
                                                        {expense.type || "Opcional"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pl-[52px] md:pl-0">
                                            <span className="font-bold text-lg text-gray-900">${expense.amount.toLocaleString()}</span>
                                            <button
                                                onClick={() => deleteExpense(expense.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {expenses.length === 0 && (
                                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-gray-500">No hay gastos fijos registrados aún.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
