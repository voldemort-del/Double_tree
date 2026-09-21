import { useState, useEffect } from 'react';
import type { RequestStatus } from '@/types';

// ============================================================
// useSlaCountdown — shared SLA timer hook.
//
// Computes time-remaining (or overdue duration) relative to
// the absolute sla_due_at deadline stored in the database.
// Timer ticks every 30 seconds; stops for terminal statuses.
//
// Usage:
//   const sla = useSlaCountdown(request.slaDeadline, request.status);
//   → { condition, text, minutesRemaining, isOverdue }
// ============================================================

export type SlaCondition = 'on_track' | 'approaching' | 'overdue' | 'completed' | 'cancelled';

export interface SlaCountdownResult {
  condition: SlaCondition;
  text: string;
  minutesRemaining: number; // negative when overdue
  isOverdue: boolean;
}

const TERMINAL: RequestStatus[] = ['Completed', 'Cancelled'];
const TICK_MS = 30_000; // 30 s — SLA precision doesn't need per-second updates

function compute(slaDueAt: string, status: RequestStatus): SlaCountdownResult {
  if (status === 'Completed') {
    return { condition: 'completed', text: 'Completed', minutesRemaining: 0, isOverdue: false };
  }
  if (status === 'Cancelled') {
    return { condition: 'cancelled', text: 'Cancelled', minutesRemaining: 0, isOverdue: false };
  }

  const mins = Math.round((new Date(slaDueAt).getTime() - Date.now()) / 60_000);

  if (mins < 0) {
    const abs = Math.abs(mins);
    const text = abs >= 60
      ? `Overdue ${Math.floor(abs / 60)}h ${abs % 60}m`
      : `Overdue ${abs}m`;
    return { condition: 'overdue', text, minutesRemaining: mins, isOverdue: true };
  }

  if (mins <= 15) {
    return { condition: 'approaching', text: `Due in ${mins}m`, minutesRemaining: mins, isOverdue: false };
  }

  if (mins < 60) {
    return { condition: 'on_track', text: `Due in ${mins}m`, minutesRemaining: mins, isOverdue: false };
  }

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const text = m > 0 ? `Due in ${h}h ${m}m` : `Due in ${h}h`;
  return { condition: 'on_track', text, minutesRemaining: mins, isOverdue: false };
}

export function useSlaCountdown(slaDueAt: string, status: RequestStatus): SlaCountdownResult {
  const [result, setResult] = useState<SlaCountdownResult>(() => compute(slaDueAt, status));

  useEffect(() => {
    setResult(compute(slaDueAt, status));

    // No timer needed for terminal statuses
    if (TERMINAL.includes(status)) return;

    const id = setInterval(() => setResult(compute(slaDueAt, status)), TICK_MS);
    return () => clearInterval(id);
  }, [slaDueAt, status]);

  return result;
}
