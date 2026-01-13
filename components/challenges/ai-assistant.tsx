"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Bot, Sparkles, Plus, Loader2 } from "lucide-react";
import { Challenge } from "@/types/challenges";
import { Button } from "@/components/ui/button";

interface AIAssistantProps {
    challenge: Challenge;
    onUpdate: (updated: Challenge) => void;
    onAddResource: (title: string, type: "skill" | "equipment") => Promise<void>;
    onAddRoadmap: (title: string, type: "milestone" | "task" | "habit") => Promise<void>;
}

export function AIAssistant({ challenge, onUpdate, onAddResource, onAddRoadmap }: AIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "user" | "model"; content: string; actions?: any[] }[]>([
        { role: "model", content: "¡Hola! Soy tu asistente personal para este Misogi. Conozco todos tus detalles y estoy aquí para ayudarte a planificar, motivarte o resolver dudas. ¿En qué podemos trabajar?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [selectedActions, setSelectedActions] = useState<any[]>([]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading, selectedActions]);

    const handleSend = async (customMessages?: any[]) => {
        const msgs = customMessages || messages;
        const currentInput = input;

        if (!customMessages && (!currentInput.trim() || isLoading)) return;

        let newMessages = msgs;
        if (!customMessages) {
            const userMsg = { role: "user" as const, content: currentInput };
            newMessages = [...msgs, userMsg];
            setMessages(newMessages);
            setInput("");
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/challenges/assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages,
                    challengeContext: challenge
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, { role: "model", content: data.message, actions: data.suggestedActions }]);
        } catch (error) {
            console.error("Assistant Error:", error);
            setMessages(prev => [...prev, { role: "model", content: "Lo siento, hubo un error conectando con mi cerebro central. ¿Podrías intentar de nuevo?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleActionSelection = (action: any) => {
        setSelectedActions(prev =>
            prev.includes(action)
                ? prev.filter(a => a !== action)
                : [...prev, action]
        );
    };

    const confirmActions = async () => {
        if (selectedActions.length === 0) return;

        setIsLoading(true);
        try {
            for (const action of selectedActions) {
                if (action.type === "add_resource") {
                    await onAddResource(action.data.title, action.data.type);
                } else if (action.type === "add_roadmap") {
                    await onAddRoadmap(action.data.title, action.data.type);
                }
            }

            // Add response from "AI" asking to save or continue
            const feedbackMsg = {
                role: "model" as const,
                content: `Excelente elección. He integrado esos ${selectedActions.length} elementos a tu plan. ¿Deseas que guardemos este progreso o prefieres seguir trabajando en otras secciones?`
            };

            setMessages(prev => {
                // Remove the actions that were just confirmed from previous messages
                const updated = prev.map(m => ({
                    ...m,
                    actions: m.actions?.filter((a: any) => !selectedActions.includes(a))
                }));
                return [...updated, feedbackMsg];
            });

            setSelectedActions([]);
        } catch (error) {
            console.error("Confirmation error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 h-14 w-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition-all z-50 group border-2 border-indigo-400/20"
            >
                <div className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-20 group-hover:opacity-40 transition-opacity" />
                <Bot className="h-6 w-6 relative" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        className="fixed bottom-24 right-8 w-[400px] h-[640px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-indigo-600/20 rounded-2xl flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-widest text-white">IA Sherpa</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Conociendo tu reto
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className="space-y-3 max-w-[85%]">
                                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${m.role === "user"
                                            ? "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/20"
                                            : "bg-slate-800 text-slate-200 rounded-tl-none border border-white/5"
                                            }`}>
                                            {m.content}
                                        </div>
                                        {m.actions && m.actions.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {m.actions.map((action, j) => {
                                                    const isSelected = selectedActions.includes(action);
                                                    return (
                                                        <button
                                                            key={j}
                                                            onClick={() => toggleActionSelection(action)}
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                                                                ${isSelected
                                                                    ? "bg-indigo-600 text-white border border-indigo-400 shadow-md shadow-indigo-600/20"
                                                                    : "bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                                                                }
                                                            `}
                                                        >
                                                            {isSelected ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                                            {action.data.title}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {selectedActions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl space-y-3"
                                >
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Seleccionados ({selectedActions.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedActions.map((a, i) => (
                                            <span key={i} className="px-2 py-1 bg-indigo-600/20 rounded text-[10px] font-bold text-indigo-300">{a.data.title}</span>
                                        ))}
                                    </div>
                                    <Button
                                        onClick={confirmActions}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest py-4 rounded-xl"
                                    >
                                        Integrar Seleccionados
                                    </Button>
                                </motion.div>
                            )}

                            {messages[messages.length - 1]?.content.includes("¿Deseas que guardemos este progreso") && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsOpen(false)}
                                        className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-xl py-4 font-bold text-[10px] uppercase tracking-widest"
                                    >
                                        Sí, Guardar & Cerrar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleSend([{ role: "user", content: "Quiero seguir trabajando." }])}
                                        className="flex-1 border-slate-700 text-slate-400 hover:bg-slate-800 rounded-xl py-4 font-bold text-[10px] uppercase tracking-widest"
                                    >
                                        Seguir Trabajando
                                    </Button>
                                </div>
                            )}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-white/5">
                                        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Input */}
                        <div className="p-6 bg-slate-950 border-t border-slate-800">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                    placeholder="Pregunta a tu sherpa..."
                                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-4 pr-12 py-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 transition-all"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
