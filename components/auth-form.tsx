"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function AuthForm() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

};

const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
            setMessage({ type: "success", text: "¡Registro exitoso! Revisa tu email para confirmar." });
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            // Session is handled automatically by Supabase listener in the parent component
            window.location.reload();
        }
    } catch (error: any) {
        let msg = error.message || "Error de autenticación";
        if (msg === "Failed to fetch") {
            msg = "Error de conexión. Es probable que falten las Variables de Entorno en Vercel (NEXT_PUBLIC_SUPABASE_URL).";
        }
        setMessage({ type: "error", text: msg });
    } finally {
        setLoading(false);
    }
};

return (
    <Card className="w-full max-w-md mx-auto mt-20 shadow-xl border-slate-200">
        <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold text-slate-900">Bienvenido</CardTitle>
            <CardDescription>
                {isSignUp ? "Crea una cuenta para guardar tus análisis" : "Ingresa a tu cuenta para ver tu historial"}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        required
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Contraseña</label>
                    <input
                        type="password"
                        required
                        minLength={6}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                </div>

                {message && (
                    <div className={`p-3 rounded-md text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {message.text}
                    </div>
                )}

                <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSignUp ? "Registrarse" : "Iniciar Sesión"}
                </Button>
            </form>

            <div className="mt-6 text-center text-sm">
                <span className="text-gray-500">
                    {isSignUp ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}
                </span>
                <button
                    onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
                    className="ml-2 font-medium text-blue-600 hover:underline"
                >
                    {isSignUp ? "Inicia Sesión" : "Regístrate"}
                </button>
            </div>
        </CardContent>
    </Card>
);
}
