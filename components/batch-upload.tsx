"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button"; // Assuming user has this or standard button
import { Loader2, UploadCloud, FileText, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BatchUploadProps {
    onUploadComplete: (files: { file: File, base64: string }[]) => void;
    isUploading?: boolean;
}

export function BatchUpload({ onUploadComplete, isUploading = false }: BatchUploadProps) {
    const [files, setFiles] = useState<{ file: File, preview?: string }[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(prev => [
            ...prev,
            ...acceptedFiles.map(file => ({
                file,
                preview: URL.createObjectURL(file)
            }))
        ]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png']
        },
        multiple: true // Allow robust batch selection
    });

    const removeFile = (idx: number) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const handleProcess = async () => {
        if (files.length === 0) return;

        // Convert all to Base64
        const processedFiles = await Promise.all(files.map(async (f) => {
            return new Promise<{ file: File, base64: string }>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(f.file);
                reader.onload = () => resolve({ file: f.file, base64: reader.result as string });
                reader.onerror = reject;
            });
        }));

        onUploadComplete(processedFiles);
    };

    return (
        <div className="w-full space-y-4">
            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer text-center",
                    isDragActive ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:border-orange-300",
                    "flex flex-col items-center justify-center gap-2"
                )}
            >
                <input {...getInputProps()} />
                <div className="p-4 bg-orange-100 rounded-full text-orange-600 mb-2">
                    <UploadCloud className="h-8 w-8" />
                </div>
                {isDragActive ? (
                    <p className="font-medium text-orange-700">¡Sueltá los resúmenes acá!</p>
                ) : (
                    <div className="space-y-1">
                        <p className="text-base font-semibold text-slate-700">Arrastrá tus resúmenes (PDF/Fotos)</p>
                        <p className="text-sm text-slate-400">Podés subir de 6 a 12 archivos juntos</p>
                    </div>
                )}
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 animate-in fade-in">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase flex justify-between items-center">
                        Archivos Seleccionados ({files.length})
                        <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:underline">Borrar Todo</button>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2">
                        {files.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100 text-sm">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    <span className="truncate text-slate-700 font-medium" title={item.file.name}>{item.file.name}</span>
                                </div>
                                <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <Button
                        onClick={handleProcess}
                        className="w-full bg-slate-900 text-white hover:bg-slate-800"
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando {files.length} archivos...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" /> Analizar {files.length} Resúmenes
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
