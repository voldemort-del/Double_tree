import { useCallback, useEffect, useMemo, useState } from 'react';
import { BedDouble, Brush, ChevronDown, CircleAlert, Clock3, Loader2, Search, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRoomOperationsData } from '@/hooks/useRoomOperations';
import { supabase } from '@/lib/supabase';
import {
  checkoutRoom,
  createRoomTask,
  getHousekeepingTeam,
  performHousekeepingAction,
  setRoomOperationalStatus,
} from '@/services/roomOperationsService';
import type {
  HousekeepingStaffAvailability,
  HousekeepingTask,
  HousekeepingTaskType,
  RoomStatus,
} from '@/types';
import { timeAgo } from '@/utils/format';
import { navigate } from '@/utils/router';

type RoomFilter = 'all' | RoomStatus | 'awaiting_cleaning' | 'awaiting_inspection' | 'blocked';

const STATUS_LABELS: Record<RoomStatus, string> = {
  occupied: 'Occupied',
  vacant: 'Vacant',
  dirty: 'Dirty',
  cleaning: 'Cleaning',
  inspected: 'Inspected',
  ready: 'Ready',
  maintenance: 'Maintenance',
  out_of_order: 'Out of order',
};

const STATUS_STYLES: Record<RoomStatus, string> = {
  occupied: 'bg-blue-50 text-blue-700 ring-blue-200',
  vacant: 'bg-slate-100 text-slate-700 ring-slate-200',
  dirty: 'bg-amber-50 text-amber-800 ring-amber-200',
  cleaning: 'bg-orange-50 text-orange-700 ring-orange-200',
  inspected: 'bg-violet-50 text-violet-700 ring-violet-200',
  ready: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  maintenance: 'bg-rose-50 text-rose-700 ring-rose-200',
  out_of_order: 'bg-red-100 text-red-800 ring-red-200',
};

const TASK_TYPES: { value: HousekeepingTaskType; label: string }[] = [
  { value: 'room_cleaning', label: 'Room cleaning' },
  { value: 'stayover_cleaning', label: 'Stayover cleaning' },
  { value: 'deep_cleaning', label: 'Deep cleaning' },
  { value: 'towel_replacement', label: 'Towel replacement' },
  { value: 'linen_replacement', label: 'Linen replacement' },
  { value: 'amenity_restocking', label: 'Amenity restocking' },
  { value: 'minibar_restocking', label: 'Minibar restocking' },
  { value: 'inspection', label: 'Inspection' },
];

function readableStatus(status: RoomStatus): string {
  return STATUS_LABELS[status];
}

function activeTaskForRoom(tasks: HousekeepingTask[], roomId: string): HousekeepingTask | undefined {
  return tasks.find(
    (task) =>
      task.roomId === roomId &&
      ['pending', 'assigned', 'in_progress', 'paused'].includes(task.status),
  );
}

export function RoomOperationsPage({ initialFilter = 'all' }: { initialFilter?: string }) {
  const { staffData } = useAuth();
  const hotelId = staffData?.hotelId ?? '';
  const isManager = staffData?.role === 'manager';
  const { rooms, tasks, loading, error, refresh } = useRoomOperationsData(hotelId);
  const [team, setTeam] = useState<HousekeepingStaffAvailability[]>([]);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RoomFilter>(
    (Object.keys(STATUS_LABELS).includes(initialFilter) ||
      ['awaiting_cleaning', 'awaiting_inspection', 'blocked'].includes(initialFilter)
      ? initialFilter
      : 'all') as RoomFilter,
  );
  const [floorFilter, setFloorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [occupancyFilter, setOccupancyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [taskType, setTaskType] = useState<HousekeepingTaskType>('room_cleaning');
  const [selectedStaff, setSelectedStaff] = useState<Record<string, string>>({});
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshTeam = useCallback(async () => {
    if (!hotelId || (!isManager && !staffData?.housekeepingEligible)) return;
    try {
      setTeam(await getHousekeepingTeam(hotelId));
      setTeamError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load housekeeping availability.';
      setTeamError(message);
      console.error(message, err);
    }
  }, [hotelId, isManager, staffData?.housekeepingEligible]);

  useEffect(() => {
    void refreshTeam();
  }, [refreshTeam]);

  useEffect(() => {
    const nextFilter: RoomFilter =
      (Object.keys(STATUS_LABELS).includes(initialFilter) ||
        ['awaiting_cleaning', 'awaiting_inspection', 'blocked'].includes(initialFilter)
        ? initialFilter
        : 'all') as RoomFilter;
    setFilter(nextFilter);
  }, [initialFilter]);

  useEffect(() => {
    if (!hotelId || !isManager) return;
    const channel = supabase
      .channel(`room-team:${hotelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_availability' }, () => void refreshTeam())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'housekeeping_tasks', filter: `hotel_id=eq.${hotelId}` }, () => void refreshTeam())
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Housekeeping workload subscription failed:', error ?? status);
          setTeamError('Live housekeeping availability is unavailable.');
        }
      });
    return () => { void supabase.removeChannel(channel); };
  }, [hotelId, isManager, refreshTeam]);

  const floors = useMemo(() => [...new Set(rooms.map((room) => room.floor))].sort((a, b) => a - b), [rooms]);
  const roomTypes = useMemo(() => [...new Set(rooms.map((room) => room.roomType))].sort(), [rooms]);

  const filteredRooms = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rooms.filter((room) => {
      const roomTask = activeTaskForRoom(tasks, room.id);
      const statusMatch =
        filter === 'all' ||
        (filter === 'awaiting_cleaning'
          ? room.status === 'dirty'
          : filter === 'awaiting_inspection'
            ? room.awaitingInspection
            : filter === 'blocked'
              ? room.status === 'out_of_order'
              : room.status === filter);
      const occupancyMatch =
        occupancyFilter === 'all' ||
        (occupancyFilter === 'occupied' ? room.status === 'occupied' : room.status !== 'occupied');
      const staffId = roomTask?.assignedStaffId ?? room.assignedHousekeeperId;
      const staffMatch = staffFilter === 'all' || staffId === staffFilter;
      const searchMatch =
        !term ||
        room.roomNumber.toLowerCase().includes(term) ||
        (room.guestName ?? '').toLowerCase().includes(term);
      return (
        statusMatch &&
        occupancyMatch &&
        staffMatch &&
        searchMatch &&
        (floorFilter === 'all' || String(room.floor) === floorFilter) &&
        (typeFilter === 'all' || room.roomType === typeFilter)
      );
    });
  }, [filter, floorFilter, occupancyFilter, rooms, search, staffFilter, tasks, typeFilter]);

  async function runAction(roomId: string, action: () => Promise<unknown>) {
    setBusyRoomId(roomId);
    setActionError(null);
    try {
      await action();
      await Promise.all([refresh(), refreshTeam()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Room action failed.';
      setActionError(message);
      console.error(message, err);
    } finally {
      setBusyRoomId(null);
    }
  }

  async function assignTask(task: HousekeepingTask, currentRoomAssignee?: string) {
    const staffId = selectedStaff[task.id] ?? task.assignedStaffId ?? currentRoomAssignee;
    if (!staffId) {
      setActionError('Choose a housekeeping team member before assigning.');
      return;
    }
    await runAction(task.roomId, () =>
      performHousekeepingAction({
        taskId: task.id,
        action: task.assignedStaffId ? 'reassign' : 'assign',
        assignedStaffId: staffId,
      }),
    );
  }

  if (!staffData) return null;

  if (!isManager && !staffData.housekeepingEligible) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Room operations are available to managers and housekeeping-authorized staff.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ops-400">Live room board</p>
          <h1 className="mt-1 text-2xl font-bold text-ops-900">Room Operations</h1>
          <p className="mt-1 text-sm text-ops-500">Room state, ownership, cleaning and inspection in one place.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/staff/housekeeping')}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-ops-900 px-4 text-sm font-semibold text-white hover:bg-ops-800"
        >
          <Brush className="h-4 w-4" /> Housekeeping tasks
        </button>
      </header>

      {(error || teamError || actionError) && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError ?? error ?? teamError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {Object.entries(STATUS_LABELS).map(([status, label]) => {
          const count = rooms.filter((room) => room.status === status).length;
          return (
            <button
              type="button"
              key={status}
              onClick={() => setFilter(status as RoomStatus)}
              className={`rounded-xl border bg-white p-3 text-left shadow-sm transition-colors ${
                filter === status ? 'border-ops-500 ring-2 ring-ops-100' : 'border-ops-200 hover:border-ops-300'
              }`}
            >
              <span className="text-xs font-medium text-ops-500">{label}</span>
              <span className="mt-1 block text-2xl font-bold tabular-nums text-ops-900">{count}</span>
            </button>
          );
        })}
      </div>

      {isManager && team.length > 0 && (
        <section className="rounded-xl border border-ops-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-ops-900">Housekeeping availability</h2>
              <p className="text-xs text-ops-500">Current shift status and active task counts.</p>
            </div>
            <span className="text-xs text-ops-500">
              {team.filter((person) => person.availability === 'available').length} available
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((person) => (
              <div key={person.id} className="flex items-center justify-between rounded-lg bg-ops-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ops-900">{person.name}</p>
                  <p className="text-xs text-ops-500">{person.activeTasks} active {person.activeTasks === 1 ? 'task' : 'tasks'}</p>
                </div>
                <AvailabilityPill availability={person.availability} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3 rounded-xl border border-ops-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(130px,0.6fr))]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search room or guest"
            className="h-11 w-full rounded-lg border border-ops-200 pl-9 pr-3 text-sm outline-none focus:border-ops-500"
          />
        </label>
        <FilterSelect label="Floor" value={floorFilter} onChange={setFloorFilter}>
          <option value="all">All floors</option>
          {floors.map((floor) => <option key={floor} value={floor}>Floor {floor}</option>)}
        </FilterSelect>
        <FilterSelect label="Room type" value={typeFilter} onChange={setTypeFilter}>
          <option value="all">All room types</option>
          {roomTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </FilterSelect>
        <FilterSelect label="Status" value={filter} onChange={(value) => setFilter(value as RoomFilter)}>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
          <option value="awaiting_cleaning">Awaiting cleaning</option>
          <option value="awaiting_inspection">Awaiting inspection</option>
          <option value="blocked">Blocked / out of order</option>
        </FilterSelect>
        <FilterSelect label="Housekeeper" value={staffFilter} onChange={setStaffFilter}>
          <option value="all">All assigned staff</option>
          {team.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        </FilterSelect>
        <FilterSelect label="Occupancy" value={occupancyFilter} onChange={setOccupancyFilter}>
          <option value="all">Occupied and vacant</option>
          <option value="occupied">Occupied</option>
          <option value="vacant">Vacant</option>
        </FilterSelect>
      </section>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-ops-500" /></div>
      ) : filteredRooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ops-300 bg-white py-14 text-center">
          <BedDouble className="mx-auto h-8 w-8 text-ops-300" />
          <p className="mt-3 text-sm font-medium text-ops-600">No rooms match these filters.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRooms.map((room) => {
            const task = activeTaskForRoom(tasks, room.id);
            const completedInspection = tasks.find(
              (item) => item.roomId === room.id && item.taskType === 'inspection' && item.status === 'completed',
            );
            const selectedPerson = task?.assignedStaffId ?? room.assignedHousekeeperId ?? '';
            return (
              <article key={room.id} className="rounded-xl border border-ops-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-ops-900">Room {room.roomNumber}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[room.status]}`}>
                        {readableStatus(room.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ops-500">{room.roomType} · Floor {room.floor}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ops-100 text-ops-600">
                    <BedDouble className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-ops-100 pt-3 text-sm">
                  <InfoLine label="Guest" value={room.guestName ?? (room.status === 'occupied' ? 'Stay details unavailable' : 'No active stay')} />
                  <InfoLine label="Housekeeper" value={task?.assignedStaffName ?? room.housekeeperName ?? 'Unassigned'} />
                  <InfoLine label="Last cleaned" value={room.lastCleanedAt ? timeAgo(room.lastCleanedAt) : 'Not recorded'} />
                  <InfoLine label="Last inspected" value={room.lastInspectedAt ? timeAgo(room.lastInspectedAt) : 'Not recorded'} />
                  <InfoLine label="Updated" value={timeAgo(room.updatedAt)} />
                </div>

                {room.maintenanceIssue && (
                  <div className="mt-3 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {room.maintenanceIssue}
                  </div>
                )}
                {room.notes && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-ops-600">Notes: {room.notes}</p>}
                {room.awaitingInspection && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">
                    <ShieldCheck className="h-4 w-4" /> Cleaning complete — inspection required
                  </div>
                )}
                {task && (
                  <div className="mt-3 rounded-lg bg-ops-50 p-3">
                    <p className="text-xs font-semibold text-ops-800">{task.title}</p>
                    <p className="mt-0.5 text-xs capitalize text-ops-500">{task.status.replace(/_/g, ' ')}</p>
                  </div>
                )}

                {isManager && (
                  <div className="mt-4 space-y-2 border-t border-ops-100 pt-3">
                    {task ? (
                      <div className="flex gap-2">
                        <select
                          aria-label={`Assign Room ${room.roomNumber}`}
                          value={selectedStaff[task.id] ?? selectedPerson}
                          onChange={(event) => setSelectedStaff((previous) => ({ ...previous, [task.id]: event.target.value }))}
                          className="h-11 min-w-0 flex-1 rounded-lg border border-ops-200 bg-white px-3 text-sm text-ops-800"
                        >
                          <option value="" disabled>Select housekeeper</option>
                          {team.map((person) => (
                            <option key={person.id} value={person.id} disabled={person.availability === 'off_shift'}>
                              {person.name} · {person.availability.replace(/_/g, ' ')} · {person.activeTasks} active
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={busyRoomId === room.id || !team.length}
                          onClick={() => void assignTask(task, room.assignedHousekeeperId)}
                          className="min-h-11 rounded-lg bg-ops-900 px-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {busyRoomId === room.id ? 'Saving…' : task.assignedStaffId ? 'Reassign' : 'Assign'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          aria-label={`Task type for Room ${room.roomNumber}`}
                          value={taskType}
                          onChange={(event) => setTaskType(event.target.value as HousekeepingTaskType)}
                          className="h-11 min-w-0 flex-1 rounded-lg border border-ops-200 bg-white px-3 text-sm text-ops-800"
                        >
                          {TASK_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                        </select>
                        <button
                          type="button"
                          disabled={busyRoomId === room.id}
                          onClick={() => void runAction(room.id, () => createRoomTask({
                            roomId: room.id,
                            taskType,
                            title: `${TASK_TYPES.find((type) => type.value === taskType)?.label ?? 'Room task'} — Room ${room.roomNumber}`,
                            description: `Manager-created ${taskType.replace(/_/g, ' ')} task for Room ${room.roomNumber}.`,
                            priority: 'Normal',
                          }))}
                          className="min-h-11 rounded-lg bg-ops-900 px-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Create task
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {room.status === 'occupied' && room.stayId && (
                        <SmallAction disabled={busyRoomId === room.id} onClick={() => void runAction(room.id, () => checkoutRoom(room.id))}>
                          Check out · mark dirty
                        </SmallAction>
                      )}
                      {room.status === 'inspected' && completedInspection && (
                        <SmallAction disabled={busyRoomId === room.id} onClick={() => void runAction(room.id, () =>
                          performHousekeepingAction({ taskId: completedInspection.id, action: 'mark_ready' }))}>
                          Mark ready
                        </SmallAction>
                      )}
                      {!['maintenance', 'out_of_order'].includes(room.status) && (
                        <SmallAction disabled={busyRoomId === room.id} onClick={() => void runAction(room.id, () =>
                          setRoomOperationalStatus(room.id, 'maintenance', 'Maintenance follow-up required.'))}>
                          Mark maintenance
                        </SmallAction>
                      )}
                      {['maintenance', 'out_of_order'].includes(room.status) && (
                        <SmallAction disabled={busyRoomId === room.id} onClick={() => void runAction(room.id, () =>
                          setRoomOperationalStatus(room.id, 'dirty', 'Released to housekeeping for cleaning.'))}>
                          Release to cleaning
                        </SmallAction>
                      )}
                      {room.status !== 'out_of_order' && (
                        <SmallAction disabled={busyRoomId === room.id} onClick={() => void runAction(room.id, () =>
                          setRoomOperationalStatus(room.id, 'out_of_order', 'Room blocked from sale.'))}>
                          Out of order
                        </SmallAction>
                      )}
                    </div>
                  </div>
                )}

                {room.status === 'occupied' && room.guestName && (
                  <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ops-400">
                    <UserRound className="h-3.5 w-3.5" /> Active stay
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AvailabilityPill({ availability }: { availability: HousekeepingStaffAvailability['availability'] }) {
  const styles = availability === 'available'
    ? 'bg-emerald-100 text-emerald-800'
    : availability === 'busy'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-slate-200 text-slate-700';
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${styles}`}>{availability.replace(/_/g, ' ')}</span>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-xs text-ops-400">{label}</span><span className="truncate text-right text-xs font-medium text-ops-700">{value}</span></div>;
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-lg border border-ops-200 bg-white px-3 pr-8 text-sm text-ops-700"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-400" />
    </label>
  );
}

function SmallAction({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-ops-200 bg-white px-3 text-xs font-semibold text-ops-700 hover:bg-ops-50 disabled:opacity-50">
      <Clock3 className="h-3.5 w-3.5" /> {children}
    </button>
  );
}
