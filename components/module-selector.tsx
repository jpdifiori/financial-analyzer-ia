import { BentoDashboard } from "@/components/bento-dashboard";

interface ModuleSelectorProps {
    userEmail?: string;
    onLogout: () => void;
}

export function ModuleSelector({ userEmail, onLogout }: ModuleSelectorProps) {
    return (
        <BentoDashboard userEmail={userEmail} onLogout={onLogout} />
    );
}
