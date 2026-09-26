import { BedDouble, Brush, CircleAlert, ClipboardCheck, DoorClosed, Wrench } from 'lucide-react';
import { useRoomOperationsData } from '@/hooks/useRoomOperations';
import type { RoomStatus } from '@/types';
import { RouterLink } from '@/utils/router';

const ROOM_STATUSES: { status: RoomStatus; label: string }[] = [
  { status: 'occupied', label: 'Occupied' },
  { status: 'vacant', label: 'Vacant' },
  { status: 'dirty', label: 'Dirty' },
  { status: 'cleaning', label: 'Cleaning' },
  { status: 'inspected', label: 'Inspected' },
  { status: 'ready', label: 'Ready' },
  { status: 'maintenance', label: 'Maintenance' },
  { status: 'out_of_order', label: 'Out of order' },
];

export function ManagerRoomSummary({ hotelId }: { hotelId: string }) {
  const { rooms, loading, error } = useRoomOperationsData(hotelId);
  const awaitingCleaning = rooms.filter((room) => room.status === 'dirty').length;
  const awaitingInspection = rooms.filter((room) => room.awaitingInspection).length;
  const maintenance = rooms.filter((room) => room.status === 'maintenance' || Boolean(room.maintenanceIssue)).length;
  const blocked = rooms.filter((room) => room.status === 'out_of_order').length;

  return (
    <section className="rounded-xl border border-ops-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-ops-900">Room operations</h2>
          <p className="text-xs text-ops-500">Live housekeeping and room readiness overview</p>
        </div>
        <RouterLink to="/staff/rooms" className="text-xs font-semibold text-sea-700 hover:underline">Open room board →</RouterLink>
      </div>

      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-9">
        <ManagerRoomMetric to="/staff/rooms" label="Total rooms" value={loading ? '—' : rooms.length} icon={<BedDouble className="h-4 w-4" />} />
        {ROOM_STATUSES.map(({ status, label }) => (
          <ManagerRoomMetric
            key={status}
            to={`/staff/rooms/${status}`}
            label={label}
            value={loading ? '—' : rooms.filter((room) => room.status === status).length}
            icon={status === 'maintenance' ? <Wrench className="h-4 w-4" /> : status === 'dirty' || status === 'cleaning' ? <Brush className="h-4 w-4" /> : status === 'out_of_order' ? <DoorClosed className="h-4 w-4" /> : <BedDouble className="h-4 w-4" />}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QueueMetric to="/staff/rooms/awaiting_cleaning" icon={<Brush className="h-4 w-4" />} label="Awaiting cleaning" value={awaitingCleaning} />
        <QueueMetric to="/staff/rooms/awaiting_inspection" icon={<ClipboardCheck className="h-4 w-4" />} label="Awaiting inspection" value={awaitingInspection} />
        <QueueMetric to="/staff/rooms/maintenance" icon={<Wrench className="h-4 w-4" />} label="Maintenance issues" value={maintenance} />
        <QueueMetric to="/staff/rooms/out_of_order" icon={<CircleAlert className="h-4 w-4" />} label="Blocked / out of order" value={blocked} />
      </div>
    </section>
  );
}

function ManagerRoomMetric({
  to,
  label,
  value,
  icon,
}: {
  to: string;
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <RouterLink to={to} className="rounded-lg border border-ops-100 bg-ops-50 px-2.5 py-2 hover:border-ops-300 hover:bg-white">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-ops-500">{icon}{label}</span>
      <span className="mt-1 block text-xl font-bold tabular-nums text-ops-900">{value}</span>
    </RouterLink>
  );
}

function QueueMetric({
  to,
  icon,
  label,
  value,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <RouterLink to={to} className="flex min-h-12 items-center justify-between gap-2 rounded-lg border border-ops-100 px-3 py-2 hover:bg-ops-50">
      <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-ops-600">{icon}<span className="truncate">{label}</span></span>
      <span className="font-bold tabular-nums text-ops-900">{value}</span>
    </RouterLink>
  );
}
