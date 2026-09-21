import { useConnectionState } from '@/hooks/useConnectionState';
import { WifiOff, Loader2 } from 'lucide-react';

// ============================================================
// ConnectionIndicator — tiny unobtrusive status dot/pill.
//
// • Connected  → small green dot only (no text, non-alarming)
// • Reconnecting → amber pill with spinner + "Reconnecting"
// • Offline     → red pill with icon + "Offline"
//
// Place inside the layout header next to the branding.
// ============================================================

export function ConnectionIndicator() {
  const status = useConnectionState();

  if (status === 'connected') {
    return (
      <span
        className="inline-block h-2 w-2 rounded-full bg-emerald-400"
        title="Live — connected"
        aria-label="Connected"
      />
    );
  }

  if (status === 'reconnecting') {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1"
        title="Reconnecting to live data…"
        aria-label="Reconnecting"
      >
        <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
        <span className="text-xs font-medium text-amber-700">Reconnecting</span>
      </div>
    );
  }

  // offline
  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1"
      title="No connection — data may be stale"
      aria-label="Offline"
    >
      <WifiOff className="h-3 w-3 text-red-500" />
      <span className="text-xs font-medium text-red-700">Offline</span>
    </div>
  );
}
