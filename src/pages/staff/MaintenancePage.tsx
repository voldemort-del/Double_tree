import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CalendarClock, ClipboardPlus, Loader2, Search, Wrench } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMaintenanceTeamRealtime, useMaintenanceWorkOrders } from '@/hooks/useMaintenance';
import { getMaintenanceTeam, MAINTENANCE_CATEGORIES, MAINTENANCE_STATUS_LABELS, performMaintenanceAction, createMaintenanceWorkOrder } from '@/services/maintenanceService';
import { getRoomOperations } from '@/services/roomOperationsService';
import type { MaintenanceCategory, MaintenanceStaffAvailability, MaintenanceWorkOrder, RequestPriority, RoomOperationsRoom } from '@/types';
import { navigate } from '@/utils/router';
import { timeAgo } from '@/utils/format';

type WorkOrderFilter = 'active' | 'all' | 'urgent' | 'mine' | 'completed';

const TERMINAL_STATUSES = new Set(['closed', 'cancelled', 'verified']);
const STATUS_STYLES: Record<MaintenanceWorkOrder['status'], string> = {
  reported: 'bg-amber-50 text-amber-800 ring-amber-200',
  assigned: 'bg-blue-50 text-blue-800 ring-blue-200',
  acknowledged: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  diagnosing: 'bg-violet-50 text-violet-800 ring-violet-200',
  repair_in_progress: 'bg-orange-50 text-orange-800 ring-orange-200',
  repair_completed: 'bg-teal-50 text-teal-800 ring-teal-200',
  verification_required: 'bg-purple-50 text-purple-800 ring-purple-200',
  verified: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  closed: 'bg-slate-100 text-slate-700 ring-slate-200',
  cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
  deferred: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
  blocked: 'bg-red-50 text-red-800 ring-red-200',
  escalated: 'bg-rose-50 text-rose-800 ring-rose-200',
};

function isActive(order: MaintenanceWorkOrder): boolean {
  return !TERMINAL_STATUSES.has(order.status);
}

export function MaintenancePage() {
  const { staffData } = useAuth();
  const hotelId = staffData?.hotelId ?? '';
  const isManager = staffData?.role === 'manager';
  const canWorkMaintenance = isManager || Boolean(staffData?.maintenanceEligible) || staffData?.department === 'Maintenance';
  const { workOrders, loading, error, refresh } = useMaintenanceWorkOrders(hotelId);
  const [team, setTeam] = useState<MaintenanceStaffAvailability[]>([]);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomOperationsRoom[]>([]);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [filter, setFilter] = useState<WorkOrderFilter>('active');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshTeam = useCallback(async () => {
    if (!hotelId || !isManager) return;
    try {
      setTeam(await getMaintenanceTeam(hotelId));
      setTeamError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load maintenance staff availability.';
      setTeamError(message);
      console.error(message, err);
    }
  }, [hotelId, isManager]);

  useEffect(() => { void refreshTeam(); }, [refreshTeam]);
  useMaintenanceTeamRealtime(hotelId, refreshTeam);

  useEffect(() => {
    if (!hotelId) return;
    let active = true;
    void getRoomOperations(hotelId).then((nextRooms) => {
      if (active) setRooms(nextRooms);
    }).catch((err) => {
      const message = err instanceof Error ? err.message : 'Unable to load rooms for maintenance work orders.';
      if (active) setRoomError(message);
      console.error(message, err);
    });
    return () => { active = false; };
  }, [hotelId]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return workOrders.filter((order) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && isActive(order)) ||
        (filter === 'urgent' && order.priority === 'Urgent' && isActive(order)) ||
        (filter === 'mine' && order.assignedStaffId === staffData?.staffId && isActive(order)) ||
        (filter === 'completed' && !isActive(order));
      const matchesSearch = !term || [
        order.title, order.category, order.roomNumber ?? '', order.assignedStaffName ?? '',
      ].some((value) => value.toLowerCase().includes(term));
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, staffData?.staffId, workOrders]);

  async function assignTechnician(order: MaintenanceWorkOrder, nextStaffId: string) {
    if (!nextStaffId && !order.assignedStaffId) return;
    setBusyId(order.id);
    setActionError(null);
    try {
      await performMaintenanceAction({
        workOrderId: order.id,
        action: nextStaffId ? (order.assignedStaffId ? 'reassign' : 'assign') : 'unassign',
        assignedStaffId: nextStaffId || undefined,
      });
      await Promise.all([refresh(), refreshTeam()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to assign this work order.';
      setActionError(message);
      setSelectedStaff((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
      console.error(message, err);
    } finally {
      setBusyId(null);
    }
  }

  if (!staffData) return null;

  if (!canWorkMaintenance) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Maintenance work orders are available to managers and maintenance-authorized staff.
      </div>
    );
  }

  const filters: { id: WorkOrderFilter; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: workOrders.filter(isActive).length },
    { id: 'urgent', label: 'Urgent', count: workOrders.filter((order) => order.priority === 'Urgent' && isActive(order)).length },
    { id: 'mine', label: 'Assigned to me', count: workOrders.filter((order) => order.assignedStaffId === staffData.staffId && isActive(order)).length },
    { id: 'completed', label: 'Completed', count: workOrders.filter((order) => !isActive(order)).length },
    { id: 'all', label: 'All work', count: workOrders.length },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ops-400">Engineering & facilities</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-ops-900">
            <Wrench className="h-6 w-6 text-amber-600" /> Maintenance
          </h1>
          <p className="mt-1 text-sm text-ops-500">Guest reports, repairs, and room-impact tracking.</p>
        </div>
        <button
          type="button"
          onClick={() => { setActionError(null); setShowCreate(true); }}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-ops-900 px-4 text-sm font-semibold text-white hover:bg-ops-800"
        >
          <ClipboardPlus className="h-4 w-4" /> Report work
        </button>
      </header>

      {(error || teamError || roomError || actionError) && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError ?? teamError ?? roomError ?? error}
        </div>
      )}

      {isManager && (
        <section className="rounded-xl border border-ops-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-ops-900">Maintenance team</h2>
              <p className="mt-0.5 text-xs text-ops-500">Availability and assigned workload update live.</p>
            </div>
            <span className="text-xs text-ops-500">{team.length} technicians</span>
          </div>
          {team.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-2 rounded-lg bg-ops-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ops-800">{member.name}</p>
                    <p className="text-xs text-ops-500">{member.departmentName} · {member.activeWorkOrders} active · {member.overdueWorkOrders} overdue</p>
                  </div>
                  <AvailabilityBadge availability={member.availability} />
                </div>
              ))}
            </div>
          ) : !teamError ? <p className="mt-3 text-sm text-ops-500">No eligible maintenance staff found.</p> : null}
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Active orders" value={workOrders.filter(isActive).length} />
        <Metric label="Urgent" value={workOrders.filter((order) => order.priority === 'Urgent' && isActive(order)).length} accent="text-red-700" />
        <Metric label="Awaiting verification" value={workOrders.filter((order) => order.status === 'verification_required').length} accent="text-purple-700" />
        <Metric label="Unassigned" value={workOrders.filter((order) => isActive(order) && !order.assignedStaffId).length} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Maintenance work order filters">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`min-h-10 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold ${
                  filter === item.id ? 'border-ops-800 bg-ops-900 text-white' : 'border-ops-200 bg-white text-ops-700'
                }`}
              >
                {item.label} <span className="ml-1 opacity-70">{item.count}</span>
              </button>
            ))}
          </div>
          <label className="relative block sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders" className="min-h-10 w-full rounded-lg border border-ops-200 bg-white pl-9 pr-3 text-sm text-ops-800" />
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center rounded-xl border border-ops-200 bg-white py-12"><Loader2 className="h-6 w-6 animate-spin text-ops-500" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ops-300 bg-white px-4 py-12 text-center">
            <Wrench className="mx-auto h-8 w-8 text-ops-300" />
            <p className="mt-3 text-sm font-semibold text-ops-800">No work orders match this view</p>
            <p className="mt-1 text-xs text-ops-500">New guest maintenance requests appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <article key={order.id} className="rounded-xl border border-ops-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button type="button" onClick={() => navigate(`/staff/maintenance/${order.id}`)} className="min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_STYLES[order.status]}`}>{MAINTENANCE_STATUS_LABELS[order.status]}</span>
                      <PriorityBadge priority={order.priority} />
                      <span className="text-xs text-ops-500">{order.category}</span>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-ops-900">{order.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-ops-600">{order.description || 'No additional description.'}</p>
                  </button>
                  <button type="button" onClick={() => navigate(`/staff/maintenance/${order.id}`)} className="rounded-lg border border-ops-200 px-3 py-2 text-xs font-semibold text-ops-700 hover:bg-ops-50">
                    View details
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ops-100 pt-3 text-xs text-ops-500">
                  <span>{order.roomNumber ? `Room ${order.roomNumber}` : 'Property-wide'}</span>
                  <span>{order.assignedStaffName ?? 'Unassigned'}</span>
                  <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Due {order.dueAt ? new Date(order.dueAt).toLocaleString() : 'not set'}</span>
                  <span>{timeAgo(order.createdAt)}</span>
                  {order.requestId && (
                    <button type="button" onClick={() => navigate(`/staff/requests/${order.requestId}`)} className="font-semibold text-sea-700 hover:underline">
                      Guest request
                    </button>
                  )}
                </div>
                {isManager && isActive(order) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label htmlFor={`assignee-${order.id}`} className="text-xs font-semibold text-ops-600">Assign:</label>
                    <select
                      id={`assignee-${order.id}`}
                      value={selectedStaff[order.id] ?? order.assignedStaffId ?? ''}
                      disabled={busyId === order.id}
                      onChange={(event) => {
                        const staffId = event.target.value;
                        setSelectedStaff((current) => ({ ...current, [order.id]: staffId }));
                        void assignTechnician(order, staffId);
                      }}
                      className="min-h-10 min-w-52 rounded-lg border border-ops-200 bg-white px-3 text-sm text-ops-800 disabled:opacity-60"
                    >
                      <option value="">Unassigned</option>
                      {team.map((member) => (
                        <option key={member.id} value={member.id} disabled={member.availability === 'off_shift' && member.id !== order.assignedStaffId}>
                          {member.name} · {member.availability.replace('_', ' ')} · {member.activeWorkOrders} active
                        </option>
                      ))}
                    </select>
                    {busyId === order.id && <Loader2 className="h-4 w-4 animate-spin text-ops-500" />}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <CreateWorkOrderDialog
          rooms={rooms}
          roomError={roomError}
          busy={busyId === 'create'}
          onClose={() => setShowCreate(false)}
          onCreate={async (input) => {
            setBusyId('create');
            setActionError(null);
            try {
              const id = await createMaintenanceWorkOrder({ hotelId, ...input });
              setShowCreate(false);
              await refresh();
              navigate(`/staff/maintenance/${id}`);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Unable to create maintenance work order.';
              setActionError(message);
              console.error(message, err);
            } finally {
              setBusyId(null);
            }
          }}
        />
      )}
    </div>
  );
}

function CreateWorkOrderDialog({
  rooms, roomError, busy, onClose, onCreate,
}: {
  rooms: RoomOperationsRoom[];
  roomError: string | null;
  busy: boolean;
  onClose: () => void;
  onCreate: (input: { roomId?: string; category: MaintenanceCategory; title: string; description: string; priority: RequestPriority }) => Promise<void>;
}) {
  const [category, setCategory] = useState<MaintenanceCategory>('General Maintenance');
  const [roomId, setRoomId] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('Normal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onCreate({ roomId: roomId || undefined, category, title, description, priority });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="create-maintenance-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <h2 id="create-maintenance-title" className="text-lg font-bold text-ops-900">Report maintenance work</h2>
        <p className="mt-1 text-sm text-ops-500">Creates a persistent work order for maintenance follow-up.</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-ops-700">
            Issue title
            <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-ops-200 px-3 font-normal" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-ops-700">
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value as MaintenanceCategory)} className="mt-1 min-h-11 w-full rounded-lg border border-ops-200 bg-white px-3 font-normal">
                {MAINTENANCE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-ops-700">
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value as RequestPriority)} className="mt-1 min-h-11 w-full rounded-lg border border-ops-200 bg-white px-3 font-normal">
                {(['Low', 'Normal', 'High', 'Urgent'] as const).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-ops-700">
            Room
            <select value={roomId} onChange={(event) => setRoomId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-ops-200 bg-white px-3 font-normal">
              <option value="">Property-wide / no room</option>
              {rooms.map((room) => <option key={room.id} value={room.id}>Room {room.roomNumber} · Floor {room.floor}</option>)}
            </select>
          </label>
          {roomError && <p className="text-xs text-amber-700">Room list unavailable; you can still create a property-wide work order.</p>}
          <label className="block text-sm font-semibold text-ops-700">
            Description
            <textarea rows={3} maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-ops-200 px-3 py-2 font-normal" />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={busy} className="min-h-10 rounded-lg border border-ops-200 px-4 text-sm font-semibold text-ops-700">Cancel</button>
            <button type="submit" disabled={busy || !title.trim()} className="flex min-h-10 items-center gap-2 rounded-lg bg-ops-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create work order
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Metric({ label, value, accent = 'text-ops-900' }: { label: string; value: number; accent?: string }) {
  return <div className="rounded-xl border border-ops-200 bg-white p-4"><p className="text-xs font-medium text-ops-500">{label}</p><p className={`mt-1 text-2xl font-bold tabular-nums ${accent}`}>{value}</p></div>;
}

function PriorityBadge({ priority }: { priority: RequestPriority }) {
  const styles: Record<RequestPriority, string> = {
    Low: 'bg-slate-100 text-slate-700',
    Normal: 'bg-blue-50 text-blue-700',
    High: 'bg-orange-50 text-orange-800',
    Urgent: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${styles[priority]}`}>
      {priority === 'Urgent' && <AlertTriangle className="h-3 w-3" />}{priority}
    </span>
  );
}

function AvailabilityBadge({ availability }: { availability: MaintenanceStaffAvailability['availability'] }) {
  const colors = {
    available: 'bg-emerald-100 text-emerald-800',
    busy: 'bg-amber-100 text-amber-800',
    off_shift: 'bg-slate-100 text-slate-600',
  };
  return <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold capitalize ${colors[availability]}`}>{availability.replace('_', ' ')}</span>;
}
