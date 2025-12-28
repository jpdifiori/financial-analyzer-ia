"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, TrendingDown, ShoppingCart, Target, PiggyBank, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STRATEGIES = [
    { id: "debts", label: "📉 Estrategia de Deudas", prompt: "Quiero armar una estrategia para pagar mis deudas." },
    { id: "purchase", label: "🛒 Analizar una Compra", prompt: "Ayúdame a analizar si me conviene hacer una compra importante ahora." },
    { id: "budget", label: "📑 Optimizar Presupuesto", prompt: "Analicemos cómo puedo optimizar mi presupuesto mensual." },
    { id: "savings", label: "💰 Plan de Ahorro", prompt: "Quiero armar un plan de ahorro eficiente." },
    { id: "invest", label: "📈 Educación Inversora", prompt: "¿En qué debería fijarme para empezar a invertir?" }
];

export function FinancialAdvisorChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (content: string) => {
        if (!content.trim()) return;

        const userMsg = { role: "user", content };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat/advisor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMsg],
                    context: {} // Can be populated later with real user metrics
                })
            });
            const data = await res.json();
            if (data.content) {
                setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
            }
        } catch (error) {
            console.error("Chat error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="mb-4 w-[380px] h-[550px] bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Asesor Financiero IA</h3>
                                    <div className="flex items-center gap-1">
                                        <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">En línea</span>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                            {messages.length === 0 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                        <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                            Hola! Soy tu asesor experto. Hoy podemos trabajar en tu libertad financiera. ¿Por dónde quieres empezar?
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {STRATEGIES.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => handleSend(s.prompt)}
                                                className="text-left px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-orange-500 hover:bg-orange-50 transition-all flex items-center justify-between group"
                                            >
                                                {s.label}
                                                <Target className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user'
                                            ? 'bg-slate-900 text-white rounded-tr-none'
                                            : 'bg-white border border-slate-200 text-slate-700 shadow-sm rounded-tl-none'
                                        }`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none">
                                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                                placeholder="Escribe tu consulta financiera..."
                                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                            <Button size="icon" onClick={() => handleSend(input)} disabled={isLoading || !input.trim()} className="bg-orange-500 hover:bg-orange-600 rounded-xl shrink-0">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="h-16 w-16 bg-slate-900 rounded-full shadow-2xl flex items-center justify-center text-white border-4 border-white overflow-hidden relative group"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-orange-600 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <MessageSquare className="h-7 w-7 relative z-10" />
            </motion.button>
        </div>
    );
}
