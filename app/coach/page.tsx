"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Goal, Task, ChatMessage } from "@/types/coach";
import { Loader2, Send, CheckCircle2, Circle, Trophy, Target, ListTodo } from "lucide-react";

export default function CoachPage() {
    const [loading, setLoading] = useState(true);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);

    useEffect(() => {
        fetchContext();
    }, []);

    const fetchContext = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [goalsRes, tasksRes] = await Promise.all([
            supabase.from("goals").select("*").eq("user_id", user.id).eq("status", "active"),
            supabase.from("tasks").select("*").eq("user_id", user.id).eq("is_done", false).order("created_at", { ascending: false })
        ]);

        if (goalsRes.data) setGoals(goalsRes.data);
        if (tasksRes.data) setTasks(tasksRes.data);

        // Initial Greeting
        setMessages([{
            role: "assistant",
            content: "Hola. Soy tu Coach. ¿En qué nos enfocamos hoy?",
            timestamp: new Date()
        }]);

        setLoading(false);
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput("");

        // Add User Message
        const newHistory = [...messages, { role: "user", content: userMsg, timestamp: new Date() } as ChatMessage];
        setMessages(newHistory);
        setIsThinking(true);

        try {
            console.log("Sending message to API...");
            // Call AI Endpoint
            const res = await fetch("/api/coach/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg,
                    context: { goals, tasks } // Send current context to AI
                })
            });

            const data = await res.json();
            console.log("API Response:", data);

            if (!res.ok) {
                throw new Error(data.error || `Server Error: ${res.status}`);
            }

            if (!data.reply) {
                console.error("Invalid Response Data:", data);
                throw new Error("La IA no devolvió una respuesta válida (formato incorrecto).");
            }

            // Add AI Response
            setMessages(prev => [...prev, {
                role: "assistant",
                content: data.reply,
                timestamp: new Date(),
                suggestedActions: data.actions
            }]);

            // Refresh context if AI performed server-side actions
            if (data.shouldRefresh) {
                fetchContext();
            }

        } catch (err: any) {
            console.error("Chat Error:", err);
            // Show error in the chat so user sees it
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `⚠️ Error: ${err.message || 'Error desconocido'}.`,
                timestamp: new Date()
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* LEFT PANEL: Context (Goals & Tasks) */}
            <div className="hidden md:flex flex-col w-1/3 max-w-sm border-r bg-white p-6 gap-6 overflow-y-auto">

                {/* Identity / Goals */}
                <section>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Trophy className="w-4 h-4" /> Identidad & Metas
                    </h3>
                    <div className="space-y-3">
                        {goals.length === 0 && <p className="text-sm text-slate-400 italic">No tienes metas activas.</p>}
                        {goals.map(g => (
                            <div key={g.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium mb-1 inline-block
                                        ${g.type === 'identity' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {g.type === 'identity' ? 'Identidad' : 'Meta'}
                                    </span>
                                    <span className="text-xs text-slate-400">{g.progress}%</span>
                                </div>
                                <h4 className="font-semibold text-slate-800">{g.title}</h4>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tasks */}
                <section className="flex-1">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ListTodo className="w-4 h-4" /> Tareas Prioritarias
                    </h3>
                    <div className="space-y-2">
                        {tasks.length === 0 && <p className="text-sm text-slate-400 italic">Estás al día.</p>}
                        {tasks.map(t => (
                            <div key={t.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded group cursor-pointer transition-colors">
                                <button className="text-slate-300 hover:text-green-500 transition-colors">
                                    <Circle className="w-5 h-5" />
                                </button>
                                <span className="text-sm text-slate-700 flex-1">{t.title}</span>
                                {t.priority === 'high' && <span className="w-2 h-2 rounded-full bg-red-400"></span>}
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* RIGHT PANEL: Chat Interface */}
            <div className="flex-1 flex flex-col h-full relative">
                <header className="h-16 border-b bg-white/80 backdrop-blur flex items-center px-6 justify-between z-10">
                    <h1 className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-2xl">🧠</span> AI Coach
                    </h1>
                    <div className="text-xs text-slate-400">Gemini 1.5 Powered</div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                            <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed
                                ${m.role === 'user'
                                    ? 'bg-orange-600 text-white rounded-tr-none'
                                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                                }`}>
                                <div className="whitespace-pre-wrap">{m.content}</div>

                                {/* Render Actions if any */}
                                {m.suggestedActions && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                        <p className="text-xs font-bold opacity-70 mb-1">Acciones sugeridas:</p>
                                        {m.suggestedActions.map((act, idx) => (
                                            <button key={idx} className="block w-full text-left text-xs bg-slate-50 hover:bg-slate-100 p-2 rounded border border-slate-200 transition-colors">
                                                👉 {act.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                <span className="text-xs text-slate-400">Pensando...</span>
                            </div>
                        </div>
                    )}
                    {/* Invisible div to scroll to bottom */}
                    <div className="h-4" />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t">
                    <div className="max-w-3xl mx-auto relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="Escribe tu reflexión, objetivo o tarea..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all resize-none shadow-sm"
                            rows={1}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isThinking}
                            className="absolute right-2 top-2 p-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="text-center mt-2 text-[10px] text-slate-300">
                        Presiona Enter para enviar
                    </div>
                </div>
            </div>
        </div>
    );
}
