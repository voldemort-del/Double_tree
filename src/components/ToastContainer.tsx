import { useToastStore, toast, type Toast, type ToastType } from '@/hooks/useToast';
import { X, CheckCircle2, AlertTriangle, Info, Flame } from 'lucide-react';

// ============================================================
// ToastContainer — renders the global toast notification stack.
// Place once in each layout (GuestLayout, StaffLayout).
// Positioned fixed so it overlays content without affecting layout.
// ============================================================

export function ToastContainer() {
  const toasts = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 top-16 z-50 flex flex-col gap-2 sm:right-6"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} item={t} />
      ))}
    </div>
  );
}

function ToastItem({ item }: { item: Toast }) {
  const borderBg: Record<ToastType, string> = {
    success: 'border-emerald-200 bg-white',
    warning: 'border-amber-200 bg-white',
    alert: 'border-red-200 bg-white',
    info: 'border-blue-100 bg-white',
  };

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex max-w-xs items-start gap-3 rounded-xl border shadow-lg px-4 py-3 animate-slide-in-right sm:max-w-sm ${borderBg[item.type]}`}
    >
      <span className="mt-0.5 flex-shrink-0">
        <ToastIcon type={item.type} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 leading-snug">{item.title}</p>
        {item.message && (
          <p className="mt-0.5 text-xs text-slate-500 leading-snug">{item.message}</p>
        )}
      </div>
      <button
        onClick={() => toast.dismiss(item.id)}
        className="flex-shrink-0 rounded text-slate-400 transition-colors hover:text-slate-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'alert':   return <Flame className="h-4 w-4 text-red-500" />;
    default:        return <Info className="h-4 w-4 text-blue-500" />;
  }
}
