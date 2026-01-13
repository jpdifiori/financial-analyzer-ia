"use client";

import { useState, useRef } from "react";
import { Mic, Square, Play, Pause, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceRecorderProps {
    onSave: (audioBlob: Blob) => void;
    onCancel: () => void;
}

export function VoiceRecorder({ onSave, onCancel }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error al acceder al micrófono:", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl space-y-8 max-w-sm w-full shadow-2xl">
            <div className="text-center space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tight">Nota de Voz</h3>
                <p className="text-slate-500 text-sm">Registra tus pensamientos del momento.</p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-6">
                {!audioUrl ? (
                    <>
                        <div className={`h-24 w-24 rounded-full flex items-center justify-center transition-all duration-500 ${isRecording ? "bg-red-500 animate-pulse" : "bg-indigo-600"}`}>
                            <Mic className="h-10 w-10 text-white" />
                        </div>
                        <div className="text-3xl font-mono font-bold text-white tracking-widest">
                            {formatTime(recordingTime)}
                        </div>
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${isRecording
                                    ? "bg-white text-slate-950 hover:bg-slate-200"
                                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                                }`}
                        >
                            {isRecording ? "Detener Grabación" : "Empezar a Grabar"}
                        </button>
                    </>
                ) : (
                    <>
                        <audio src={audioUrl} controls className="w-full" />
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => {
                                    setAudioBlob(null);
                                    setAudioUrl(null);
                                    setRecordingTime(0);
                                }}
                                className="flex-1 py-4 rounded-2xl bg-slate-900 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" /> Reintentar
                            </button>
                            <button
                                onClick={() => audioBlob && onSave(audioBlob)}
                                className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-bold uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                            >
                                <Send className="h-4 w-4" /> Guardar
                            </button>
                        </div>
                    </>
                )}
            </div>

            <button
                onClick={onCancel}
                className="w-full text-center text-xs font-bold text-slate-600 hover:text-slate-400 transition-colors pt-2"
            >
                Cancelar
            </button>
        </div>
    );
}
