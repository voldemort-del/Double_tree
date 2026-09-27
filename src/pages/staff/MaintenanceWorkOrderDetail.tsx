import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, Loader2, UserRound, Wrench } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMaintenanceWorkOrder, useMaintenanceTeamRealtime } from '@/hooks/useMaintenance';
import {
  getAvailableMaintenanceActions,
  getMaintenanceTeam,
  MAINTENANCE_ACTION_LABELS,
  MAINTENANCE_STATUS_LABELS,
  performMaintenanceAction,
} from '@/services/maintenanceService';
import type { MaintenanceAction, MaintenanceRoomImpact, MaintenanceStaffAvailability, RequestPriority } from '@/types';
import { navigate } from '@/utils/router';
import { timeAgo } from '@/utils/format';

const ACTIONS_REQUIRING_DETAILS = new Set<MaintenanceAction>([
  'save_diagnosis', 'complete_repair', 'add_note', 'blocked', 'defer', 'escalate', 'cancel', 'reopen',
]);

export function MaintenanceWorkOrderDetail({ workOrderId }: { workOrderId: string }) {
  const { staffData } = useAuth();
  const hotelId = staffData?.hotelId ?? '';
  const isManager = staffData?.role === 'manager';
  const canWorkMaintenance = isManager || Boolean(staffData?.maintenanceEligible) || staffData?.department === 'Maintenance';
  const { workOrder, events, loading, error, refresh } = useMaintenanceWorkOrder(hotelId, workOrderId);
  const [team, setTeam] = useState<MaintenanceStaffAvailability[]>([]);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedImpact, setSelectedImpact] = useState<MaintenanceRoomImpact>('none');
  const [selectedAction, setSelectedAction] = useState<MaintenanceAction | null>(null);
  const [note, setNote] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [resolution, setResolution] = useState('');
  const [partsMaterials, setPartsMaterials] = useState('');
  const [busy, setBusy] = useState(false);
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
    setSelectedStaff(workOrder?.assignedStaffId ?? '');
    setSelectedImpact(workOrder?.roomImpact ?? 'none');
    setDiagnosis(workOrder?.diagnosis ?? '');
    setResolution(workOrder?.resolution ?? '');
    setPartsMaterials(workOrder?.partsMaterials ?? '');
  }, [workOrder]);

  if (!staffData) return null;
  if (!canWorkMaintenance) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Maintenance work orders are available to managers and maintenance-authorized staff.</div>;
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ops-500" /></div>;
  }
  if (error || !workOrder) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => navigate('/staff/maintenance')} className="flex items-center gap-2 text-sm font-semibold text-ops-600"><ArrowLeft className="h-4 w-4" /> Maintenance work orders</button>
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error ?? 'Work order not found or you do not have access to it.'}</div>
      </div>
    );
  }

  const availableActions = getAvailableMaintenanceActions(workOrder, isManager, staffData.staffId);
  const isActive = !['closed', 'cancelled', 'verified'].includes(workOrder.status);
  const assignedStaffBeforeAction = workOrder.assignedStaffId;
  const roomImpactBeforeAction = workOrder.roomImpact;

  async function runAction(action: MaintenanceAction, values?: {
    note?: string;
    diagnosis?: string;
    resolution?: string;
    partsMaterials?: string;
    assignedStaffId?: string;
    roomImpact?: MaintenanceRoomImpact;
  }) {
    setBusy(true);
    setActionError(null);
    try {
      await performMaintenanceAction({ workOrderId, action, ...values });
      setSelectedAction(null);
      setNote('');
      await Promise.all([refresh(), refreshTeam()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update this maintenance work order.';
      setActionError(message);
      if (action === 'assign' || action === 'reassign' || action === 'unassign') {
        setSelectedStaff(assignedStaffBeforeAction ?? '');
      }
      if (action === 'set_room_impact') setSelectedImpact(roomImpactBeforeAction);
      console.error(message, err);
    } finally {
      setBusy(false);
    }
  }

  function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAction) return;
    void runAction(selectedAction, {
      note: note || undefined,
      diagnosis: diagnosis || undefined,
      resolution: resolution || undefined,
      partsMaterials: partsMaterials || undefined,
    });
  }

  function chooseAction(action: MaintenanceAction) {
    setActionError(null);
    if (ACTIONS_REQUIRING_DETAILS.has(action)) {
      setNote('');
      setSelectedAction(action);
    } else {
      void runAction(action);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <button type="button" onClick={() => navigate('/staff/maintenance')} className="flex items-center gap-2 text-sm font-semibold text-ops-600 hover:text-ops-900">
        <ArrowLeft className="h-4 w-4" /> Maintenance work orders
      </button>

      {(error || actionError || teamError) && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError ?? teamError ?? error}</div>}

      <header className="rounded-2xl border border-ops-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-ops-100 px-2.5 py-1 text-xs font-bold text-ops-700">{MAINTENANCE_STATUS_LABELS[workOrder.status]}</span>
              <PriorityBadge priority={workOrder.priority} />
              <span className="text-xs font-semibold text-ops-500">{workOrder.category}</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-ops-900">{workOrder.title}</h1>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ops-600">{workOrder.description || 'No additional description.'}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Wrench className="h-6 w-6" /></div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-ops-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Room" value={workOrder.roomNumber ? `Room ${workOrder.roomNumber}` : 'Property-wide'} icon={<ClipboardList className="h-4 w-4" />} />
          <Info label="Assigned technician" value={workOrder.assignedStaffName ?? 'Unassigned'} icon={<UserRound className="h-4 w-4" />} />
          <Info label="Due" value={workOrder.dueAt ? new Date(workOrder.dueAt).toLocaleString() : 'Not set'} icon={<CalendarClock className="h-4 w-4" />} />
          <Info label="Reported" value={`${workOrder.reportedByName ?? (workOrder.reportedByType === 'guest' ? 'Guest' : workOrder.reportedByType === 'system' ? 'Preventive schedule' : 'Staff')} · ${timeAgo(workOrder.createdAt)}`} icon={<CheckCircle2 className="h-4 w-4" />} />
        </div>

        {workOrder.requestId && (
          <button type="button" onClick={() => navigate(`/staff/requests/${workOrder.requestId}`)} className="mt-4 text-sm font-semibold text-sea-700 hover:underline">
            Open linked guest request
          </button>
        )}
      </header>

      {isManager && isActive && (
        <section className="grid gap-4 rounded-xl border border-ops-200 bg-white p-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-ops-700">
            Assign maintenance technician
            <select
              value={selectedStaff}
              disabled={busy}
              onChange={(event) => {
                const staffId = event.target.value;
                setSelectedStaff(staffId);
                void runAction(staffId ? (workOrder.assignedStaffId ? 'reassign' : 'assign') : 'unassign', { assignedStaffId: staffId || undefined });
              }}
              className="mt-1 min-h-11 w-full rounded-lg border border-ops-200 bg-white px-3 font-normal"
            >
              <option value="">Unassigned</option>
              {team.map((member) => (
                <option key={member.id} value={member.id} disabled={member.availability === 'off_shift' && member.id !== workOrder.assignedStaffId}>
                  {member.name} · {member.availability.replace('_', ' ')} · {member.activeWorkOrders} active · {member.overdueWorkOrders} overdue
                </option>
              ))}
            </select>
          </label>
          {workOrder.roomId && (
            <label className="block text-sm font-semibold text-ops-700">
              Room impact
              <select
                value={selectedImpact}
                disabled={busy}
                onChange={(event) => {
                  const impact = event.target.value as MaintenanceRoomImpact;
                  setSelectedImpact(impact);
                  void runAction('set_room_impact', { roomImpact: impact });
                }}
                className="mt-1 min-h-11 w-full rounded-lg border border-ops-200 bg-white px-3 font-normal"
              >
                <option value="none">No room impact</option>
                <option value="maintenance">Maintenance</option>
                <option value="out_of_order">Out of order</option>
              </select>
            </label>
          )}
        </section>
      )}

      {(workOrder.diagnosis || workOrder.resolution || workOrder.partsMaterials || workOrder.notes) && (
        <section className="grid gap-3 sm:grid-cols-2">
          {workOrder.diagnosis && <TextPanel title="Diagnosis" text={workOrder.diagnosis} />}
          {workOrder.resolution && <TextPanel title="Resolution" text={workOrder.resolution} />}
          {workOrder.partsMaterials && <TextPanel title="Parts & materials" text={workOrder.partsMaterials} />}
          {workOrder.notes && <TextPanel title="Work order notes" text={workOrder.notes} />}
        </section>
      )}

      <section className="rounded-xl border border-ops-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-ops-900">Work order actions</h2>
            <p className="mt-1 text-xs text-ops-500">Actions are validated and recorded by the maintenance workflow.</p>
          </div>
          {busy && <Loader2 className="h-5 w-5 animate-spin text-ops-500" />}
        </div>
        {availableActions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {availableActions.map((action) => (
              <button
                key={action}
                type="button"
                disabled={busy}
                onClick={() => chooseAction(action)}
                className={`min-h-10 rounded-lg border px-3 text-sm font-semibold disabled:opacity-50 ${
                  ['cancel', 'blocked', 'escalate'].includes(action)
                    ? 'border-red-200 text-red-700 hover:bg-red-50'
                    : 'border-ops-200 text-ops-700 hover:bg-ops-50'
                }`}
              >
                {MAINTENANCE_ACTION_LABELS[action]}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-lg bg-ops-50 px-3 py-2 text-sm text-ops-600">
            {isManager ? 'Use technician assignment or room impact above to manage this order.' : 'This work order is not assigned to you, so no technician actions are available.'}
          </p>
        )}
      </section>

      {selectedAction && (
        <section className="rounded-xl border border-sea-200 bg-sea-50 p-4">
          <h2 className="text-sm font-bold text-ops-900">{MAINTENANCE_ACTION_LABELS[selectedAction]}</h2>
          <form onSubmit={submitAction} className="mt-3 space-y-3">
            {selectedAction === 'save_diagnosis' && (
              <label className="block text-sm font-semibold text-ops-700">
                Diagnosis
                <textarea required rows={3} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} className="mt-1 w-full rounded-lg border border-ops-200 bg-white px-3 py-2 font-normal" />
              </label>
            )}
            {selectedAction === 'complete_repair' && (
              <>
                <label className="block text-sm font-semibold text-ops-700">
                  Resolution
                  <textarea required rows={3} value={resolution} onChange={(event) => setResolution(event.target.value)} className="mt-1 w-full rounded-lg border border-ops-200 bg-white px-3 py-2 font-normal" />
                </label>
                <label className="block text-sm font-semibold text-ops-700">
                  Parts & materials used
                  <textarea rows={2} value={partsMaterials} onChange={(event) => setPartsMaterials(event.target.value)} className="mt-1 w-full rounded-lg border border-ops-200 bg-white px-3 py-2 font-normal" />
                </label>
              </>
            )}
            {selectedAction !== 'save_diagnosis' && selectedAction !== 'complete_repair' && (
              <label className="block text-sm font-semibold text-ops-700">
                {selectedAction === 'add_note' ? 'Note' : 'Reason / note'}
                <textarea required={selectedAction === 'add_note'} rows={3} value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full rounded-lg border border-ops-200 bg-white px-3 py-2 font-normal" />
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setSelectedAction(null)} className="min-h-10 rounded-lg border border-ops-200 bg-white px-4 text-sm font-semibold text-ops-700">Back</button>
              <button type="submit" disabled={busy || (selectedAction === 'save_diagnosis' && !diagnosis.trim()) || (selectedAction === 'complete_repair' && !resolution.trim()) || (selectedAction === 'add_note' && !note.trim())} className="min-h-10 rounded-lg bg-ops-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
                Confirm
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-ops-200 bg-white p-4">
        <h2 className="text-sm font-bold text-ops-900">Activity history</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-ops-500">No work order events yet.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {events.map((event) => (
              <li key={event.id} className="relative border-l border-ops-200 pl-4">
                <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-sea-500 ring-2 ring-white" />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-sm font-semibold text-ops-800">{event.message || event.eventType.replace(/_/g, ' ')}</p>
                  <time className="text-xs text-ops-400">{new Date(event.createdAt).toLocaleString()}</time>
                </div>
                <p className="mt-0.5 text-xs capitalize text-ops-500">{event.actorName} · {event.eventType.replace(/_/g, ' ')}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="flex items-start gap-2.5"><span className="mt-0.5 text-ops-400">{icon}</span><div><p className="text-[11px] font-medium uppercase tracking-wide text-ops-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-ops-800">{value}</p></div></div>;
}

function TextPanel({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-ops-200 bg-white p-4"><h2 className="text-xs font-bold uppercase tracking-wide text-ops-500">{title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ops-700">{text}</p></div>;
}

function PriorityBadge({ priority }: { priority: RequestPriority }) {
  const styles: Record<RequestPriority, string> = {
    Low: 'bg-slate-100 text-slate-700',
    Normal: 'bg-blue-50 text-blue-700',
    High: 'bg-orange-50 text-orange-800',
    Urgent: 'bg-red-100 text-red-800',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[priority]}`}>{priority}</span>;
}
