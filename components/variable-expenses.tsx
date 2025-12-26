"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";

type VariableExpense = {
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
    expense_type?: string;
};

export function VariableExpenses() {
    const [expenses, setExpenses] = useState<VariableExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState("");
    const [category, setCategory] = useState("General");
    const [expenseType, setExpenseType] = useState("Efectivo");

    // [New Code] State for Scanning
    const [isScanning, setIsScanning] = useState(false);
    const [scannedItems, setScannedItems] = useState<VariableExpense[]>([]);
    const [showReview, setShowReview] = useState(false);
    const [debugLog, setDebugLog] = useState<string | null>(null); // New Debug State

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        const { data, error } = await supabase
            .from("variable_expenses")
            .select("*")
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
            alert("Error al guardar");
        } else {
            setExpenses([data[0], ...expenses]);
            setDescription("");
            setAmount("");
            setDate("");
            setCategory("General");
            setExpenseType("Efectivo");
        }
    };

    const deleteExpense = async (id: string) => {
        const { error } = await supabase
            .from("variable_expenses")
            .delete()
            .eq("id", id);

        if (error) console.error("Error deleting expense:", error);
        else setExpenses(expenses.filter((e) => e.id !== id));
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
                alert(`Error: ${data.error || "No se detectaron items"}`);
                setShowReview(false);
            }
            setIsScanning(false);

        } catch (e: any) {
            console.error(e);
            alert(`Error analizando el archivo: ${e.message}`);
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
            alert("Error al importar gastos.");
        } else {
            setExpenses([...(data || []), ...expenses]);
            setScannedItems([]);
            setShowReview(false);
            alert("¡Gastos importados correctamente!");
        }
    };

    const removeScannedItem = (idx: number) => {
        setScannedItems(scannedItems.filter((_, i) => i !== idx));
    };

    const totalVariable = expenses.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Gastos Variables (Puntuales)</CardTitle>
                    {/* [New Code] Upload Button */}
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                            disabled={isScanning}
                        />
                        <Button variant="outline" disabled={isScanning}>
                            {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            {isScanning ? "Analizando..." : "Escanear Ticket"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>

                    {/* Debug Log */}
                    {debugLog && (
                        <div className="mt-4 p-2 bg-gray-900 text-green-400 text-xs rounded overflow-auto max-h-40">
                            <strong>Debug Info:</strong>
                            <pre>{debugLog}</pre>
                        </div>
                    )}

                    {/* [New Code] Review Section */}
                    {showReview && (
                        <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg animate-in fade-in">
                            <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
                                <span className="bg-orange-200 p-1 rounded mr-2">🤖</span>
                                Gastos Detectados ({scannedItems.length})
                            </h3>

                            {isScanning ? (
                                <div className="text-center py-8 text-orange-600">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                    <p>Leyendo tu comprobante con IA...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
                                        {scannedItems.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-orange-100 text-sm">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{item.description}</p>
                                                    <div className="flex gap-2 text-xs text-gray-500">
                                                        <span>{item.date}</span>
                                                        <span className="bg-orange-100 text-orange-700 px-1 rounded">{item.category}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold">${item.amount.toLocaleString()}</span>
                                                    <button onClick={() => removeScannedItem(idx)} className="text-gray-400 hover:text-red-500">
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {scannedItems.length === 0 && <p className="text-sm text-center text-gray-500">No se encontraron items válidos.</p>}
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => { setShowReview(false); setScannedItems([]); }}>
                                            Cancelar
                                        </Button>
                                        <Button size="sm" onClick={confirmImport} disabled={scannedItems.length === 0} className="bg-orange-600 hover:bg-orange-700 text-white">
                                            Confirmar e Importar
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <form onSubmit={addExpense} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-6 pt-4 border-t">
                        <input
                            placeholder="Descripción (ej. Cena)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="px-3 py-2 border rounded-md"
                            required
                        />
                        <input
                            type="number"
                            placeholder="Monto"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="px-3 py-2 border rounded-md"
                            required
                        />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="px-3 py-2 border rounded-md"
                            required
                        />
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="px-3 py-2 border rounded-md"
                        >
                            <option value="General">General</option>
                            <option value="Supermercado">Supermercado</option>
                            <option value="Comida">Comida</option>
                            <option value="Servicios">Servicios</option>
                            <option value="Transporte">Transporte</option>
                            <option value="Entretenimiento">Entretenimiento</option>
                            <option value="Salud">Salud</option>
                            <option value="Educación">Educación</option>
                            <option value="Ropa">Ropa</option>
                            <option value="Hogar">Hogar</option>
                            <option value="Otros">Otros</option>
                        </select>
                        <select
                            value={expenseType}
                            onChange={(e) => setExpenseType(e.target.value)}
                            className="px-3 py-2 border rounded-md"
                        >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Débito">Débito</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="QR">QR / Billetera Virtual</option>
                        </select>
                        <Button type="submit" className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> Agregar Manual
                        </Button>
                    </form>

                    {loading ? (
                        <div className="text-center p-4"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></div>
                    ) : (
                        <div>
                            <div className="bg-slate-100 p-4 rounded-lg mb-4 flex justify-between items-center font-bold">
                                <span>Total Variables:</span>
                                <span className="text-lg">${totalVariable.toLocaleString()}</span>
                            </div>
                            <div className="space-y-2">
                                {expenses.map((expense) => (
                                    <div key={expense.id} className="flex justify-between items-center p-3 bg-white border rounded-md shadow-sm">
                                        <div>
                                            <p className="font-medium">{expense.description}</p>
                                            <div className="flex gap-2 text-xs text-gray-500 mt-1">
                                                <span>{expense.date}</span>
                                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{expense.category || "General"}</span>
                                                {expense.expense_type && (
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{expense.expense_type}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold">${expense.amount.toLocaleString()}</span>
                                            <button onClick={() => deleteExpense(expense.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {expenses.length === 0 && <p className="text-center text-gray-500 text-sm">No hay gastos variables registrados.</p>}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
