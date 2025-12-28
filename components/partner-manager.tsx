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
        <div className="space-y-6">
            <Card className="border-indigo-100 bg-indigo-50/20">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-600" /> Finanzas Compartidas (YNAB Together)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Comparte tus objetivos y gastos con un socio o pareja. Una vez aceptada la invitación, podrán ver los datos consolidados.
                    </p>

                    {!activePartnership && (
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="Email de tu pareja"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="max-w-md"
                            />
                            <Button onClick={handleInvite} disabled={isSending} className="bg-indigo-600 hover:bg-indigo-700">
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                Invitar
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4">
                {activePartnership && (
                    <Card className="border-emerald-200 bg-emerald-50/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">Alianza Activa</h3>
                                        <p className="text-xs text-slate-500">Compartiendo datos con {activePartnership.invitee_email}</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" className="text-red-600 border-red-100 hover:bg-red-50">
                                    Desvincular
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {pendingInvites.map(p => (
                    <Card key={p.id} className="border-amber-100 bg-amber-50/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">Invitación Pendiente</h3>
                                        <p className="text-xs text-slate-500">Enviada a: {p.invitee_email}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-slate-400">
                                    Cancelar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
