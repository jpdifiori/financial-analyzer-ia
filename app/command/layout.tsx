export default function CommandLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 pt-24">
                {children}
            </main>
        </div>
    );
}
