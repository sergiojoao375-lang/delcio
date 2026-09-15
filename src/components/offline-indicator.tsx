import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-3 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-2"
    >
      <div className="flex items-center gap-2 rounded-full bg-destructive px-4 py-1.5 text-xs font-medium text-destructive-foreground shadow-lg">
        <WifiOff className="h-3.5 w-3.5" />
        <span>Sem ligação</span>
      </div>
    </div>
  );
}
