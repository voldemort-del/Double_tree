import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, ClipboardList, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { CHANNELS } from '@/realtime/channels';
import { getStaffShifts, createShiftHandover, getHandovers, updateHandoverItem } from '@/services/scheduleService';
import type { ShiftHandover, StaffShift } from '@/types';

const day = () => new Date().toISOString().slice(0, 10);

export function HandoverPage() {
  const { staffData } = useAuth();
  const [handovers, setHandovers] = useState<ShiftHandover[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!staffData?.hotelId) return;
    try {
      const [nextHandovers, nextShifts] = await Promise.all([getHandovers(staffData.hotelId), getStaffShifts(staffData.hotelId, day(), day())]);
      setHandovers(nextHandovers); setShifts(nextShifts); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load handovers.'); }
    finally { setLoading(false); }
  }, [staffData?.hotelId]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!staffData?.hotelId || !isSupabaseConfigured) return;
    const channel = supabase.channel(CHANNELS.shiftHandovers(staffData.hotelId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_handovers', filter: `hotel_id=eq.${staffData.hotelId}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_handover_items' }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh, staffData?.hotelId]);

  async function create() {
    const shift = shifts.find((item) => item.staffId === staffData?.staffId && item.status === 'active');
    if (!shift) { setError('Start an active shift before creating a handover.'); return; }
    try { await createShiftHandover(shift.id, notes); setNotes(''); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to create handover.'); }
  }
  async function updateItem(id: string, status: 'carried_forward' | 'waiting' | 'resolved') {
    try { await updateHandoverItem({ id, status, note: '', managerAttention: status !== 'resolved' }); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to update handover item.'); }
  }

  if (!staffData) return null;
  return <div className="mx-auto max-w-4xl space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400">Shift continuity</p><h1 className="mt-1 text-2xl font-bold text-ops-800">Shift handover</h1><p className="mt-1 text-sm text-ops-500">Transfer unresolved work without duplicating the operational record.</p></div><button onClick={() => void refresh()} className="rounded-lg border border-ops-300 bg-sand-200 p-2 text-ops-600"><RefreshCw className="h-4 w-4" /></button></header>
    {error && <div role="alert" className="rounded-lg border border-red-300/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>}
    {!staffData || staffData.role !== 'manager' ? <section className="rounded-xl border border-gold-700/40 bg-sand-200 p-4"><h2 className="font-semibold text-ops-800">End-of-shift handover</h2><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add context for the next shift" className="mt-3 min-h-24 w-full rounded-lg border border-ops-300 bg-sand-100 p-3 text-sm" /><button onClick={() => void create()} className="btn-gold mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"><ClipboardList className="h-4 w-4" /> Create handover</button></section> : null}
    {loading ? <Loader2 className="h-7 w-7 animate-spin text-gold-400" /> : handovers.length === 0 ? <div className="rounded-xl border border-dashed border-ops-300 p-10 text-center text-sm text-ops-500">No handovers recorded yet.</div> : <div className="space-y-4">{handovers.map((handover) => <section key={handover.id} className="rounded-xl border border-ops-300 bg-sand-200 p-4"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-ops-800">{handover.createdByName}'s handover</h2><span className="text-xs text-ops-500">{new Date(handover.createdAt).toLocaleString()}</span>{handover.items.some((item) => item.managerAttention && item.status !== 'resolved') && <span className="ml-auto inline-flex items-center gap-1 text-xs text-red-300"><AlertTriangle className="h-3 w-3" /> Manager attention</span>}</div><p className="mt-2 text-sm text-ops-600">{handover.notes || 'No additional notes.'}</p><div className="mt-3 space-y-2">{handover.items.map((item) => <div key={item.id} className="rounded-lg border border-ops-300 bg-sand-100 p-3"><div className="flex flex-wrap items-center gap-2"><span className="text-xs uppercase tracking-wide text-gold-400">{item.itemType}</span><span className="font-medium text-ops-800">{item.title}</span>{item.roomNumber && <span className="text-xs text-ops-500">Room {item.roomNumber}</span>}<span className="ml-auto text-xs text-ops-500">{item.status.replace('_', ' ')}</span></div><p className="mt-1 text-xs text-ops-500">{item.note}</p>{item.status !== 'resolved' && <div className="mt-2 flex flex-wrap gap-2"><button onClick={() => void updateItem(item.id, 'carried_forward')} className="inline-flex items-center gap-1 rounded border border-gold-700/40 px-2 py-1 text-xs text-gold-300"><ArrowRight className="h-3 w-3" /> Carry forward</button><button onClick={() => void updateItem(item.id, 'resolved')} className="inline-flex items-center gap-1 rounded border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300"><Check className="h-3 w-3" /> Resolve</button></div>}</div>)}</div></section>)}</div>}
  </div>;
}
