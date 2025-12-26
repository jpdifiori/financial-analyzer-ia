"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, TrendingUp, Zap, Lock, BarChart3, BrainCircuit } from "lucide-react";

interface LandingPageProps {
    onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-orange-500/30">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
                        <div className="h-8 w-8 bg-gradient-to-tr from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Zap className="h-5 w-5 text-white fill-white" />
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            FinAnalyzer.IA
                        </span>
                    </div>
                    <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
                        <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
                        <a href="#security" className="hover:text-white transition-colors">Seguridad</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Planes</a>
                    </div>
                    <Button
                        onClick={onLoginClick}
                        variant="ghost"
                        className="text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                        Iniciar Sesión
                    </Button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-orange-600/20 rounded-full blur-[120px] -z-10 opacity-50 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] -z-10 opacity-30 pointer-events-none" />

                <div className="container mx-auto text-center max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800 text-xs font-medium text-orange-400 mb-4 hover:border-orange-500/50 transition-colors cursor-default">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                        </span>
                        Nueva IA v2.0 Disponible
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                        Tu Salud Financiera, <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-pink-500 to-indigo-500 animate-gradient-x">
                            Potenciada por IA
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Deja de adivinar en qué se va tu dinero. Nuestra IA audita tus tarjetas, detecta gastos hormiga y crea un plan de acción personalizado para que recuperes el control.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                        <Button
                            onClick={onLoginClick}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg rounded-full shadow-lg shadow-orange-600/25 transition-all hover:scale-105"
                        >
                            Comenzar Ahora <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button
                            variant="outline"
                            className="px-8 py-6 text-lg rounded-full border-slate-700 text-slate-300 hover:bg-slate-900 hover:text-white transition-all"
                        >
                            Ver Demo
                        </Button>
                    </div>

                    <div className="pt-12 flex justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
                        {/* Fake Logos for Social Proof Aesthetic */}
                        <div className="flex items-center gap-2 font-bold text-slate-500"><ShieldCheck className="h-5 w-5" /> Security First</div>
                        <div className="flex items-center gap-2 font-bold text-slate-500"><Lock className="h-5 w-5" /> Encrypted</div>
                        <div className="flex items-center gap-2 font-bold text-slate-500"><BrainCircuit className="h-5 w-5" /> Advanced AI</div>
                    </div>
                </div>
            </section>

            {/* Features Feature Grid */}
            <section id="features" className="py-24 bg-slate-950 relative">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-8">

                        {/* Feature 1 */}
                        <div className="group p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-orange-500/30 hover:bg-slate-900/80 transition-all duration-500">
                            <div className="h-14 w-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-orange-500/10 transition-all duration-500">
                                <TrendingUp className="h-7 w-7 text-orange-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-100">Auditoría Forense</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Sube tus resúmenes y detecta automáticamente comisiones ocultas, intereses abusivos y suscripciones fantasma que drenan tu billetera.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900/80 transition-all duration-500 delay-100">
                            <div className="h-14 w-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all duration-500">
                                <BrainCircuit className="h-7 w-7 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-100">Coach Financiero IA</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Un asesor personal 24/7 que analiza tus hábitos y te propone estrategias concretas para desendeudarte y ahorrar más rápido.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900/80 transition-all duration-500 delay-200">
                            <div className="h-14 w-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-500/10 transition-all duration-500">
                                <BarChart3 className="h-7 w-7 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-100">Control Total</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Visualiza la evolución de tus deudas, categoriza gastos automáticamente y recibe alertas antes de que sea demasiado tarde.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section id="security" className="py-24 border-t border-slate-900 bg-gradient-to-b from-slate-950 to-black">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-12">Tu Seguridad es Prioridad</h2>
                    <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto text-left">
                        <div className="flex gap-6">
                            <div className="h-12 w-12 bg-green-900/20 rounded-full flex items-center justify-center shrink-0">
                                <Lock className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold mb-2">Encriptación de Punta a Punta</h4>
                                <p className="text-slate-400">Tus datos viajan y se almacenan encriptados. Nadie, ni siquiera nosotros, podemos ver tus credenciales bancarias.</p>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="h-12 w-12 bg-blue-900/20 rounded-full flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold mb-2">Privacidad Absoluta</h4>
                                <p className="text-slate-400">No vendemos tus datos. Nuestro modelo de negocio es ayudarte a ahorrar, no comerciar con tu información.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-900 bg-black text-slate-500 text-sm">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 font-bold text-slate-300">
                        <Zap className="h-4 w-4 text-orange-500" /> FinAnalyzer.IA
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-white transition-colors">Términos</a>
                        <a href="#" className="hover:text-white transition-colors">Privacidad</a>
                        <a href="#" className="hover:text-white transition-colors">Soporte</a>
                    </div>
                    <div>
                        © 2024 Financial Analyzer AI. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
