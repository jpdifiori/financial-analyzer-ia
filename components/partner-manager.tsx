"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Users, Mail, CheckCircle2, XCircle, Send } from "lucide-react";

export function PartnerManager() {
    const [loading, setLoading] = useState(true);
    const [partnerships, setPartnerships] = useState<any[]>([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        fetchPartnerships();
    }, []);

    const fetchPartnerships = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from("partnerships").select("*");
            setPartnerships(data || []);
        } catch (error) {
            console.error("Error fetching partnerships:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail) return;
        setIsSending(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from("partnerships").insert({
                inviter_id: user.id,
                invitee_email: inviteEmail
            });

            if (error) throw error;
            setInviteEmail("");
            fetchPartnerships();
        } catch (error) {
            console.error("Error inviting partner:", error);
        } finally {
            setIsSending(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-orange-500" /></div>;

    const activePartnership = partnerships.find(p => p.status === 'active');
    const pendingInvites = partnerships.filter(p => p.status === 'pending');

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Invite Card */}
            <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-200/50 border border-slate-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cobalt-blue to-cyan-400 opacity-100" />

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h3 className="text-2xl font-serif text-charcoal-grey font-bold tracking-tight flex items-center gap-3">
                        <div className="h-10 w-10 bg-cobalt-blue/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-cobalt-blue" />
                        </div>
                        Finanzas Compartidas (YNAB Together)
                    </h3>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
                    <p className="text-sm font-medium text-slate-500 mb-4 max-w-2xl">
                        Comparte tus objetivos y gastos con un socio o pareja. Una vez aceptada la invitación, podrán ver los datos consolidados y colaborar en las metas.
                    </p>

                    {!activePartnership && (
                        <div className="flex gap-4 items-center">
                            <Input
                                type="email"
                                placeholder="Email de tu pareja"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="max-w-md p-3 bg-white border-2 border-slate-200 rounded-xl text-charcoal-grey font-medium placeholder:text-slate-300 focus:ring-2 focus:ring-cobalt-blue/20 focus:border-cobalt-blue transition-all h-auto"
                            />
                            <Button onClick={handleInvite} disabled={isSending} className="bg-electric-orange hover:bg-orange-600 text-white rounded-xl h-auto py-3 px-6 shadow-lg shadow-electric-orange/20">
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                Invitar
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-1 gap-6">
                {/* Active Partnership */}
                {activePartnership && (
                    <div className="bg-white rounded-[24px] p-8 shadow-xl shadow-cobalt-blue/5 border border-slate-200 relative overflow-hidden group animate-in slide-in-from-bottom-2">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-cobalt-blue/5 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-110" />

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cobalt-blue to-blue-600 flex items-center justify-center shadow-lg shadow-cobalt-blue/30">
                                    <CheckCircle2 className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-charcoal-grey mb-1">Alianza Activa</h3>
                                    <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        Compartiendo datos con <span className="text-cobalt-blue font-bold underline decoration-dotted">{activePartnership.invitee_email}</span>
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" className="border-slate-200 text-slate-400 hover:text-vibrant-magenta hover:bg-rose-50 hover:border-rose-100 rounded-xl px-6 py-6 h-auto font-bold transition-all">
                                Desvincular
                            </Button>
                        </div>
                    </div>
                )}

                {/* Pending Invites */}
                {pendingInvites.map(p => (
                    <div key={p.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-lg transition-all animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 ring-4 ring-amber-50/50">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-charcoal-grey">Invitación Pendiente</h3>
                                <p className="text-xs text-slate-400 font-medium">Enviada a: {p.invitee_email}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-charcoal-grey hover:bg-slate-50 rounded-xl">
                            Cancelar
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
