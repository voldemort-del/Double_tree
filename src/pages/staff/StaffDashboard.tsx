import { useStaffRequests } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { RequestCard } from '@/components/RequestCard';
import type { Department } from '@/types';
import { isOverdue, minutesUntil } from '@/utils/format';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { RouterLink } from '@/utils/router';

const DEPARTMENTS: Department[] = [
  'Front Desk',
  'Housekeeping',
  'Maintenance',
  'Food & Beverage',
  'Concierge',
  'Spa & Wellness',
];

export function StaffDashboard() {
  const { staffData } = useAuth();
  const { requests: allRequests, loading } = useStaffRequests(staffData?.hotelId ?? '');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-ops-400" />
      </div>
    );
  }

  const open = allRequests.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled');
  const newReq = allRequests.filter((r) => r.status === 'Submitted');
  const inProgress = allRequests.filter((r) => r.status === 'In Progress');
  const completedToday = allRequests.filter((r) => {
    if (r.status !== 'Completed' || !r.completedAt) return false;
    const d = new Date(r.completedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const overdue = allRequests.filter((r) => isOverdue(r));
  const onTime = allRequests.filter((r) => r.status === 'Completed' && !isOverdue(r));
  const slaPerformance = allRequests.length > 0 ? Math.round((onTime.length / allRequests.length) * 100) : 100;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ops-900">Operations Dashboard</h1>
          <p className="text-sm text-ops-400">Real-time overview of all hotel service requests.</p>
        </div>
        <RouterLink to="/staff/requests" className="flex items-center gap-1.5 rounded-lg bg-ops-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ops-800">
          All Requests <ArrowRight className="h-3.5 w-3.5" />
        </RouterLink>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Open" value={open.length} icon={<Inbox className="h-4 w-4" />} color="text-ops-700" bg="bg-ops-50" />
        <Stat label="New" value={newReq.length} icon={<ClipboardList className="h-4 w-4" />} color="text-amber-700" bg="bg-amber-50" />
        <Stat label="In Progress" value={inProgress.length} icon={<Clock className="h-4 w-4" />} color="text-indigo-700" bg="bg-indigo-50" />
        <Stat label="Completed Today" value={completedToday.length} icon={<CheckCircle2 className="h-4 w-4" />} color="text-emerald-700" bg="bg-emerald-50" />
        <Stat label="Overdue" value={overdue.length} icon={<AlertTriangle className="h-4 w-4" />} color="text-red-700" bg="bg-red-50" alert={overdue.length > 0} />
        <Stat label="SLA Performance" value={`${slaPerformance}%`} icon={<TrendingUp className="h-4 w-4" />} color="text-sea-700" bg="bg-sea-50" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* New / urgent requests */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ops-400">Incoming Requests</h2>
            <span className="text-xs text-ops-300">{newReq.length} awaiting assignment</span>
          </div>
          <div className="space-y-3">
            {open.slice(0, 5).map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                to={`/staff/requests/${req.id}`}
                showGuest
                guestName={req.guestName}
                showStaff
                staffName={req.assignedStaffName}
              />
            ))}
            {open.length === 0 && (
              <div className="rounded-xl border border-dashed border-ops-200 bg-white p-8 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" />
                <p className="mt-2 text-sm text-ops-400">All caught up — no open requests.</p>
              </div>
            )}
          </div>
        </div>

        {/* Department breakdown */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ops-400">By Department</h2>
          <div className="rounded-xl border border-ops-200 bg-white p-4">
            <div className="space-y-3">
              {DEPARTMENTS.map((dept) => {
                const deptReqs = allRequests.filter((r) => r.department === dept);
                const deptOpen = deptReqs.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled').length;
                const deptOverdue = deptReqs.filter((r) => isOverdue(r)).length;
                const max = Math.max(...DEPARTMENTS.map((d) => allRequests.filter((r) => r.department === d).length), 1);
                return (
                  <div key={dept}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-ops-700">{dept}</span>
                      <span className="text-ops-400">
                        {deptOpen} open{deptOverdue > 0 && <span className="text-red-500"> · {deptOverdue} overdue</span>}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-ops-100">
                      <div
                        className={`h-full rounded-full ${deptOverdue > 0 ? 'bg-red-400' : 'bg-ops-500'}`}
                        style={{ width: `${(deptReqs.length / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overdue alerts */}
          {overdue.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                <AlertTriangle className="h-4 w-4" /> Overdue Alerts
              </div>
              <div className="mt-2 space-y-2">
                {overdue.slice(0, 3).map((r) => {
                  const remaining = minutesUntil(r.slaDeadline);
                  return (
                    <RouterLink key={r.id} to={`/staff/requests/${r.id}`} className="block rounded-lg bg-white px-3 py-2 text-xs transition-colors hover:bg-red-100">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium text-red-700">{r.shortId}</span>
                        <span className="font-medium text-red-600">{Math.abs(remaining)}m overdue</span>
                      </div>
                      <p className="mt-0.5 truncate text-ops-600">{r.title} — Room {r.roomNumber}</p>
                    </RouterLink>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  color,
  bg,
  alert,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${alert ? 'border-red-200 bg-red-50' : 'border-ops-200 bg-white'}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg} ${color}`}>{icon}</span>
        <span className="text-xs font-medium text-ops-400">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${alert ? 'text-red-700' : 'text-ops-900'}`}>{value}</p>
    </div>
  );
}
