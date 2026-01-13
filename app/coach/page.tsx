"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
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

        // Initial Greeting specialized for Purchase Analysis
        setMessages([{
            role: "assistant",
            content: "Hola. Soy tu Asesor Financiero. ¿Tienes alguna compra en mente? Puedo ayudarte a analizar si es el momento ideal y cómo impactaría en tus metas.",
            timestamp: new Date(),
            suggestedActions: [
                { label: "Análisis de posible compra", type: "chat_prompt" }
            ]
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
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 font-outfit">
                        <Trophy className="w-3 h-3" /> Metas de Vida
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
                <header className="h-14 border-b bg-white/50 backdrop-blur-md flex items-center px-6 justify-between z-10">
                    <h1 className="font-black text-slate-800 flex items-center gap-2 font-outfit text-sm uppercase tracking-widest">
                        Intelligence Engine
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
                    </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-500`}>
                            <div className={cn(
                                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                                m.role === 'user'
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'bg-white border border-slate-200/60 text-slate-700 shadow-sm'
                            )}>
                                <div className="whitespace-pre-wrap">{m.content}</div>

                                {/* Render Actions if any */}
                                {m.suggestedActions && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                                        {m.suggestedActions.map((act, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    if (act.type === 'chat_prompt' || !act.type) {
                                                        setInput(act.label);
                                                        // We don't call sendMessage directly to let the user see it 
                                                        // or we can just send it. Let's send it for speed.
                                                        const fakeEvent = { preventDefault: () => { } };
                                                        setTimeout(() => {
                                                            const sendBtn = document.getElementById('send-coach-msg');
                                                            sendBtn?.click();
                                                        }, 100);
                                                    }
                                                }}
                                                className="text-[10px] font-black uppercase tracking-widest bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 transition-all"
                                            >
                                                {act.label}
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
                <div className="p-6 bg-white/50 backdrop-blur-md border-t">
                    <div className="max-w-4xl mx-auto relative group">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="Mensaje para el Asesor..."
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-14 py-4 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all resize-none shadow-sm"
                            rows={1}
                        />
                        <button
                            id="send-coach-msg"
                            onClick={sendMessage}
                            disabled={!input.trim() || isThinking}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="text-center pb-4 text-[10px] text-slate-300">
                    Presiona Enter para enviar
                </div>
            </div>
        </div>
    );
}
