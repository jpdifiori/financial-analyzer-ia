"use client";

import { AssetManager } from "./asset-manager";
import { LiabilityManager } from "./liability-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Receipt } from "lucide-react";

export function BalanceSheet() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center max-w-2xl mx-auto space-y-2">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Tu Balance General</h2>
                <p className="text-slate-500 text-sm">
                    Gestiona tu patrimonio neto real. Registra tus activos (lo que posees) y tus pasivos (tus deudas).
                </p>
            </div>

            <Tabs defaultValue="assets" className="w-full">
                <div className="flex justify-center mb-8">
                    <TabsList className="bg-slate-100 p-1">
                        <TabsTrigger value="assets" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 font-bold px-8">
                            <Building2 className="h-4 w-4 mr-2" /> Activos
                        </TabsTrigger>
                        <TabsTrigger value="liabilities" className="data-[state=active]:bg-white data-[state=active]:text-red-700 font-bold px-8">
                            <Receipt className="h-4 w-4 mr-2" /> Pasivos
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="assets">
                    <AssetManager />
                </TabsContent>

                <TabsContent value="liabilities">
                    <LiabilityManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
