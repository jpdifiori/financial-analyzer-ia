"use client";

import { useState } from "react";
import { Challenge, Note } from "@/types/challenges";
import {
    Plus, Mic, MessageSquare, Trash2,
    Calendar, Play, Square, Sparkles, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceRecorder } from "./voice-recorder";
import { motion, AnimatePresence } from "framer-motion";

interface LogbookTabProps {
    challenge: Challenge;
    onUpdate: (updated: Challenge) => void;
}

import { supabase } from "@/lib/supabase";

export function LogbookTab({ challenge, onUpdate }: LogbookTabProps) {
    const [showRecorder, setShowRecorder] = useState(false);
    const [noteContent, setNoteContent] = useState("");
    const [showPrompts, setShowPrompts] = useState(false);

    const prompts = [
        "¿Qué fue lo más difícil de hoy?",
        "¿En qué momento estuviste a punto de rendirte?",
        "¿Qué aprendiste sobre tu nueva identidad?",
        "¿Cómo visualizas el éxito de mañana?",
    ];

    const saveTextNote = async (content?: string) => {
        const text = content || noteContent;
        if (!text) return;

        const { data, error } = await supabase
            .from("challenge_logbook")
            .insert([{
                challenge_id: challenge.id,
                content: text,
                type: "text"
            }])
            .select()
            .single();

        if (error || !data) return;

        const note: Note = {
            id: data.id,
            content: data.content,
            type: "text",
            timestamp: data.created_at
        };

        onUpdate({
            ...challenge,
            logbook: [note, ...challenge.logbook]
        });
        setNoteContent("");
        setShowPrompts(false);
    };

    const saveVoiceNote = async (blob: Blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64 = reader.result as string;

            const { data, error } = await supabase
                .from("challenge_logbook")
                .insert([{
                    challenge_id: challenge.id,
                    content: "Nota de voz",
                    type: "voice",
                    audio_url: base64
                }])
                .select()
                .single();

            if (error || !data) return;

            const note: Note = {
                id: data.id,
                content: data.content,
                type: "voice",
                audioUrl: data.audio_url,
                timestamp: data.created_at
            };

            onUpdate({
                ...challenge,
                logbook: [note, ...challenge.logbook]
            });
            setShowRecorder(false);
        };
    };

    const removeNote = async (id: string) => {
        const { error } = await supabase
            .from("challenge_logbook")
            .delete()
            .eq("id", id);

        if (!error) {
            onUpdate({
                ...challenge,
                logbook: challenge.logbook.filter(n => n.id !== id)
            });
        }
    };

    return (
        <div className="space-y-12">
            {/* Input Section */}
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-6">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black uppercase tracking-tight">Bitácora</h2>
                        <p className="text-slate-500 text-sm italic">Documenta la batalla. Cada entrada es un paso hacia tu transformación.</p>
                    </div>
                    <button
                        onClick={() => setShowPrompts(!showPrompts)}
                        className={`p-3 rounded-full border transition-all ${showPrompts ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-800 text-slate-500 hover:text-white hover:border-slate-700"}`}
                        title="Preguntas Disparadoras"
                    >
                        <Sparkles className="h-5 w-5" />
                    </button>
                </div>

                <div className="relative">
                    <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Registra tu progreso o reflexiona sobre el día..."
                        className="w-full h-32 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <button
                            onClick={() => setShowRecorder(true)}
                            className="p-3 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white hover:border-indigo-500 transition-all"
                        >
                            <Mic className="h-5 w-5" />
                        </button>
                        <Button
                            onClick={() => saveTextNote()}
                            disabled={!noteContent}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" /> Guardar Nota
                        </Button>
                    </div>
                </div>

                {/* Prompts Overlay/Area */}
                <AnimatePresence>
                    {showPrompts && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800"
                        >
                            {prompts.map((p, i) => (
                                <button
                                    key={i}
                                    onClick={() => setNoteContent(p + "\n\n")}
                                    className="p-4 text-left bg-slate-950/50 border border-slate-800 rounded-2xl text-xs font-medium text-slate-400 hover:border-indigo-500/50 hover:text-white transition-all"
                                >
                                    {p}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Note Feed */}
            <div className="space-y-6 max-w-3xl mx-auto">
                {challenge.logbook.map((note) => (
                    <div key={note.id} className="group relative p-8 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4 hover:border-slate-700 transition-all">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                <Calendar className="h-3 w-3" />
                                {new Date(note.timestamp).toLocaleDateString()} - {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <button
                                onClick={() => removeNote(note.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-700 hover:text-red-400 transition-all"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        {note.type === "voice" ? (
                            <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                                    <Mic className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <audio src={note.audioUrl} controls className="w-full h-8 grayscale contrast-125" />
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                                {note.content}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Voice Recorder Modal */}
            <AnimatePresence>
                {showRecorder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm">
                        <VoiceRecorder
                            onSave={saveVoiceNote}
                            onCancel={() => setShowRecorder(false)}
                        />
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
