import { useState, useEffect } from 'react';

// ============================================================
// Lightweight in-memory toast notification system.
// No external library. No database. No context provider.
//
// Uses a module-level store so any component can call
// toast.show() without prop drilling or context setup.
//
// Auto-dismiss after `duration` ms (default 5000).
// Max 6 toasts visible at once — oldest are culled.
//
// Usage (anywhere):
//   import { toast } from '@/hooks/useToast';
//   toast.show({ type: 'success', title: 'Done!', message: 'All good.' });
//
// Usage in components (to render the list):
//   import { useToastStore } from '@/hooks/useToast';
//   const toasts = useToastStore(); // reactive
// ============================================================

export type ToastType = 'success' | 'info' | 'warning' | 'alert';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number; // ms; 0 = sticky
}

// ── Module-level store ──────────────────────────────────────
let _toasts: Toast[] = [];
type Listener = (toasts: Toast[]) => void;
const _listeners = new Set<Listener>();

function _notify() {
  const snapshot = [..._toasts];
  _listeners.forEach((fn) => fn(snapshot));
}

// ── Public API ──────────────────────────────────────────────
export const toast = {
  show(input: Omit<Toast, 'id' | 'duration'> & { duration?: number }): string {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const duration = input.duration ?? 5000;
    const item: Toast = { ...input, id, duration };

    // Prepend and cap at 6
    _toasts = [item, ..._toasts].slice(0, 6);
    _notify();

    if (duration > 0) {
      setTimeout(() => toast.dismiss(id), duration);
    }

    return id;
  },

  dismiss(id: string): void {
    _toasts = _toasts.filter((t) => t.id !== id);
    _notify();
  },

  dismissAll(): void {
    _toasts = [];
    _notify();
  },
};

// ── Reactive hook ────────────────────────────────────────────
export function useToastStore(): Toast[] {
  const [state, setState] = useState<Toast[]>(() => [..._toasts]);

  useEffect(() => {
    setState([..._toasts]);
    _listeners.add(setState);
    return () => { _listeners.delete(setState); };
  }, []);

  return state;
}
