import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Loader2, Play, Square } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { endStaffShift, getStaffShifts, startStaffShift } from '@/services/scheduleService';
import type { StaffShift } from '@/types';

const dateString = (date: Date) => date.toISOString().slice(0, 10);

export function MySchedulePage() {
  const { staffData } = useAuth();
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = dateString(new Date());

  const refresh = useCallback(async () => {
    if (!staffData?.hotelId) return;
    try {
      setShifts(await getStaffShifts(staffData.hotelId, today, dateString(new Date(Date.now() + 14 * 86400000))));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your schedule.');
    } finally {
      setLoading(false);
    }
  }, [staffData?.hotelId, today]);
  useEffect(() => { void refresh(); }, [refresh]);

  const todays = useMemo(() => shifts.filter((shift) => shift.date === today), [shifts, today]);
  async function action(shift: StaffShift, type: 'start' | 'end') {
    try {
      if (type === 'start') await startStaffShift(shift.id); else await endStaffShift(shift.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update shift.');
    }
  }

  if (!staffData) return null;
  return <div className="mx-auto max-w-3xl space-y-5">
    <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400">People operations</p><h1 className="mt-1 text-2xl font-bold text-ops-800">My schedule</h1><p className="mt-1 text-sm text-ops-500">Your shifts, availability, and handover starting points.</p></header>
    {error && <div role="alert" className="rounded-lg border border-red-300/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>}
    <section className="rounded-xl border border-gold-700/40 bg-sand-200 p-5"><div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-gold-400" /><div><p className="text-xs uppercase tracking-wider text-ops-500">Today's shift</p><p className="text-lg font-semibold text-ops-800">{todays.length ? `${todays[0].startTime.slice(0, 5)}–${todays[0].endTime.slice(0, 5)}` : 'No shift scheduled'}</p></div></div>{todays[0] && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-ops-700">{todays[0].departmentName} · {todays[0].shiftType}</p><p className="mt-1 text-xs text-ops-500">{todays[0].notes || 'No shift notes.'}</p></div><div className="flex gap-2">{todays[0].status === 'scheduled' && <button onClick={() => void action(todays[0], 'start')} className="btn-gold inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"><Play className="h-4 w-4" /> Start shift</button>}{todays[0].status === 'active' && <button onClick={() => void action(todays[0], 'end')} className="inline-flex items-center gap-2 rounded-lg border border-red-400/40 px-3 py-2 text-sm text-red-300"><Square className="h-4 w-4" /> End shift</button>}<span className="inline-flex items-center gap-1 rounded-lg border border-ops-300 px-3 py-2 text-xs text-ops-600">{todays[0].status === 'active' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Clock3 className="h-4 w-4 text-gold-400" />}{todays[0].status}</span></div></div>}</section>
    <section><h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ops-500">Upcoming shifts</h2>{loading ? <Loader2 className="h-6 w-6 animate-spin text-gold-400" /> : shifts.filter((shift) => shift.date !== today).length === 0 ? <p className="rounded-xl border border-dashed border-ops-300 p-6 text-sm text-ops-500">No upcoming shifts.</p> : <div className="space-y-2">{shifts.filter((shift) => shift.date !== today).map((shift) => <div key={shift.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-ops-300 bg-sand-200 p-4"><CalendarDays className="h-4 w-4 text-gold-400" /><span className="font-medium text-ops-800">{shift.date}</span><span className="text-sm text-ops-600">{shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}</span><span className="text-sm text-ops-500">{shift.departmentName}</span><span className="ml-auto text-xs text-ops-500">{shift.status}</span></div>)}</div>}</section>
  </div>;
}
