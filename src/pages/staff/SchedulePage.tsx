import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Loader2, Plus, RefreshCw, Users, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { CHANNELS } from '@/realtime/channels';
import { getDepartmentsByHotel, getStaffByHotel, type StaffWithDepartment } from '@/services/staffService';
import { cancelStaffShift, createStaffShift, getStaffShifts, updateStaffShift } from '@/services/scheduleService';
import type { DepartmentRow } from '@/types/database';
import type { StaffShift } from '@/types';

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const today = isoDate(new Date());
const shiftTypes: StaffShift['shiftType'][] = ['morning', 'afternoon', 'evening', 'night', 'custom'];

export function SchedulePage() {
  const { staffData } = useAuth();
  const [view, setView] = useState<'day' | 'week'>('day');
  const [date, setDate] = useState(today);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [staff, setStaff] = useState<StaffWithDepartment[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [department, setDepartment] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ staffId: '', departmentId: '', date: today, startTime: '07:00', endTime: '15:00', shiftType: 'morning' as StaffShift['shiftType'], notes: '' });

  const range = useMemo(() => {
    const start = new Date(`${date}T12:00:00`);
    if (view === 'day') return { start: date, end: date };
    const day = start.getDay();
    const monday = new Date(start);
    monday.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    const end = new Date(monday);
    end.setDate(monday.getDate() + 6);
    return { start: isoDate(monday), end: isoDate(end) };
  }, [date, view]);

  const refresh = useCallback(async () => {
    if (!staffData?.hotelId) return;
    setLoading(true);
    try {
      const [nextShifts, nextStaff, nextDepartments] = await Promise.all([
        getStaffShifts(staffData.hotelId, range.start, range.end),
        getStaffByHotel(staffData.hotelId),
        getDepartmentsByHotel(staffData.hotelId),
      ]);
      setShifts(nextShifts);
      setStaff(nextStaff.filter((member) => member.role === 'staff'));
      setDepartments(nextDepartments);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load schedule.');
    } finally {
      setLoading(false);
    }
  }, [range.end, range.start, staffData?.hotelId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!staffData?.hotelId || !isSupabaseConfigured) return;
    const channel = supabase.channel(CHANNELS.staffSchedule(staffData.hotelId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_shifts', filter: `hotel_id=eq.${staffData.hotelId}` }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh, staffData?.hotelId]);

  async function saveShift(event: React.FormEvent) {
    event.preventDefault();
    if (!staffData?.hotelId || !form.staffId || !form.departmentId) return;
    setSaving(true);
    try {
      await createStaffShift({ hotelId: staffData.hotelId, ...form });
      setFormOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create shift.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(shift: StaffShift, status: StaffShift['status']) {
    try {
      await updateStaffShift({ id: shift.id, date: shift.date, startTime: shift.startTime, endTime: shift.endTime, shiftType: shift.shiftType, status, notes: shift.notes });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update shift.');
    }
  }

  if (!staffData || staffData.role !== 'manager') return <div className="rounded-xl border border-ops-200 bg-sand-200 p-6 text-ops-700">Manager access is required for staff scheduling.</div>;

  const visible = department === 'all' ? shifts : shifts.filter((shift) => shift.departmentId === department);
  const active = visible.filter((shift) => shift.status === 'active').length;
  const scheduled = visible.filter((shift) => shift.status === 'scheduled').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400">People operations</p>
          <h1 className="mt-1 text-2xl font-bold text-ops-800">Staff schedule</h1>
          <p className="mt-1 text-sm text-ops-500">Plan coverage, monitor shifts, and keep every department informed.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setFormOpen((open) => !open)} className="btn-gold inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"><Plus className="h-4 w-4" /> Create shift</button>
          <button type="button" onClick={() => void refresh()} className="rounded-lg border border-ops-300 bg-sand-200 p-2 text-ops-600 hover:bg-sand-300" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-300/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>}

      {formOpen && (
        <form onSubmit={saveShift} className="grid gap-3 rounded-xl border border-gold-700/40 bg-sand-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-ops-600">Staff<select required value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="mt-1 w-full rounded-lg border border-ops-300 bg-sand-100 p-2 text-sm"><option value="">Select staff</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}</select></label>
          <label className="text-xs font-medium text-ops-600">Department<select required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="mt-1 w-full rounded-lg border border-ops-300 bg-sand-100 p-2 text-sm"><option value="">Select department</option>{departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}</select></label>
          <label className="text-xs font-medium text-ops-600">Date<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full rounded-lg border border-ops-300 bg-sand-100 p-2 text-sm" /></label>
          <label className="text-xs font-medium text-ops-600">Shift type<select value={form.shiftType} onChange={(e) => setForm({ ...form, shiftType: e.target.value as StaffShift['shiftType'] })} className="mt-1 w-full rounded-lg border border-ops-300 bg-sand-100 p-2 text-sm">{shiftTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="text-xs font-medium text-ops-600">Start<input required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="mt-1 w-full rounded-lg border border-ops-300 bg-sand-100 p-2 text-sm" /></label>
          <label className="text-xs font-medium text-ops-600">End<input required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="mt-1 w-full rounded-lg border border-ops-300 bg-sand-100 p-2 text-sm" /></label>
          <label className="text-xs font-medium text-ops-600 sm:col-span-2">Notes<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full rounded-lg border border-ops-300 bg-sand-100 p-2 text-sm" placeholder="Handover or coverage notes" /></label>
          <div className="flex items-end gap-2"><button disabled={saving} className="btn-gold inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save</button><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-ops-300 px-3 py-2 text-sm text-ops-600">Cancel</button></div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Scheduled" value={scheduled} icon={<CalendarDays className="h-4 w-4" />} />
        <Metric label="Currently active" value={active} icon={<Users className="h-4 w-4" />} />
        <Metric label="Departments" value={new Set(visible.map((shift) => shift.departmentId)).size} icon={<Users className="h-4 w-4" />} />
        <Metric label="Unassigned coverage" value={departments.filter((dept) => !visible.some((shift) => shift.departmentId === dept.id)).length} icon={<Clock3 className="h-4 w-4" />} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ops-300 bg-sand-200 p-3">
        <div className="flex rounded-lg border border-ops-300 overflow-hidden"><button onClick={() => setView('day')} className={`px-3 py-1.5 text-sm ${view === 'day' ? 'bg-gold-500 text-sand-50' : 'text-ops-600'}`}>Today</button><button onClick={() => setView('week')} className={`px-3 py-1.5 text-sm ${view === 'week' ? 'bg-gold-500 text-sand-50' : 'text-ops-600'}`}>Week</button></div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-ops-300 bg-sand-100 px-3 py-1.5 text-sm text-ops-700" />
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-lg border border-ops-300 bg-sand-100 px-3 py-1.5 text-sm text-ops-700"><option value="all">All departments</option>{departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}</select>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-gold-400" /></div> : visible.length === 0 ? <div className="rounded-xl border border-dashed border-ops-300 p-10 text-center text-sm text-ops-500">No shifts scheduled for this view.</div> : <div className="space-y-2">{visible.map((shift) => <ShiftRow key={shift.id} shift={shift} onStatus={changeStatus} onCancel={async () => { await cancelStaffShift(shift.id); await refresh(); }} />)}</div>}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-ops-300 bg-sand-200 p-4"><span className="flex items-center gap-2 text-xs text-ops-500">{icon}{label}</span><strong className="mt-1 block text-2xl text-ops-800">{value}</strong></div>;
}

function ShiftRow({ shift, onStatus, onCancel }: { shift: StaffShift; onStatus: (shift: StaffShift, status: StaffShift['status']) => Promise<void>; onCancel: () => Promise<void> }) {
  return <article className="flex flex-wrap items-center gap-3 rounded-xl border border-ops-300 bg-sand-200 p-4">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-500/20 text-gold-300"><Users className="h-5 w-5" /></div>
    <div className="min-w-[170px] flex-1"><p className="font-semibold text-ops-800">{shift.staffName}</p><p className="text-xs text-ops-500">{shift.departmentName} · {shift.shiftType}</p></div>
    <div className="flex items-center gap-1 text-sm text-ops-600"><Clock3 className="h-4 w-4 text-gold-400" />{shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}</div>
    <span className="rounded-full border border-ops-300 px-2 py-1 text-xs text-ops-600">{shift.status.replace('_', ' ')}</span>
    {shift.status === 'scheduled' && <button onClick={() => void onStatus(shift, 'active')} className="rounded-lg border border-gold-700/50 px-2.5 py-1.5 text-xs text-gold-300">Mark active</button>}
    {shift.status !== 'cancelled' && shift.status !== 'completed' && <button onClick={() => void onCancel()} className="rounded-lg border border-red-400/30 px-2.5 py-1.5 text-xs text-red-300"><X className="inline h-3 w-3" /> Cancel</button>}
  </article>;
}
