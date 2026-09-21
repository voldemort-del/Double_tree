import { useStaffRequests } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import type { Department, RequestPriority } from '@/types';
import { isOverdue, minutesUntil, timeAgo } from '@/utils/format';
import { RouterLink } from '@/utils/router';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  Loader2,
} from 'lucide-react';

const DEPARTMENTS: Department[] = [
  'Front Desk',
  'Housekeeping',
  'Maintenance',
  'Food & Beverage',
  'Concierge',
  'Spa & Wellness',
];

const PRIORITIES: RequestPriority[] = ['Urgent', 'High', 'Normal', 'Low'];

export function ManagerView() {
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
  const completedToday = allRequests.filter((r) => {
    if (r.status !== 'Completed' || !r.completedAt) return false;
    return new Date(r.completedAt).toDateString() === new Date().toDateString();
  });
  const overdue = allRequests.filter((r) => isOverdue(r));
  const onTime = allRequests.filter((r) => r.status === 'Completed' && new Date(r.completedAt ?? r.createdAt).getTime() <= new Date(r.slaDeadline).getTime());
  const slaPerformance = allRequests.length > 0 ? Math.round((onTime.length / allRequests.length) * 100) : 100;

  // Staff workload
  const workload = allRequests
    .filter((r) => r.assignedStaffName && r.status !== 'Completed' && r.status !== 'Cancelled')
    .reduce((acc, r) => {
      const name = r.assignedStaffName!;
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  // Department stats
  const deptStats = DEPARTMENTS.map((dept) => {
    const reqs = allRequests.filter((r) => r.department === dept);
    return {
      dept,
      total: reqs.length,
      open: reqs.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled').length,
      completed: reqs.filter((r) => r.status === 'Completed').length,
      overdue: reqs.filter((r) => isOverdue(r)).length,
    };
  });

  // Priority distribution
  const priorityDist = PRIORITIES.map((p) => ({
    priority: p,
    count: allRequests.filter((r) => r.priority === p).length,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-ops-900">Manager Overview</h1>
        <p className="text-sm text-ops-400">What is happening across the hotel right now.</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BigStat label="Total Open Requests" value={open.length} icon={<Inbox className="h-5 w-5" />} color="text-ops-700" bg="bg-ops-50" />
        <BigStat label="Completed Today" value={completedToday.length} icon={<CheckCircle2 className="h-5 w-5" />} color="text-emerald-700" bg="bg-emerald-50" />
        <BigStat label="Overdue" value={overdue.length} icon={<AlertTriangle className="h-5 w-5" />} color="text-red-700" bg="bg-red-50" alert={overdue.length > 0} />
        <BigStat label="SLA Performance" value={`${slaPerformance}%`} icon={<TrendingUp className="h-5 w-5" />} color="text-sea-700" bg="bg-sea-50" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department breakdown */}
        <div className="rounded-xl border border-ops-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-ops-400" />
            <h2 className="text-sm font-semibold text-ops-900">Requests by Department</h2>
          </div>
          <div className="mt-4 space-y-4">
            {deptStats.map((d) => {
              const max = Math.max(...deptStats.map((x) => x.total), 1);
              return (
                <div key={d.dept}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ops-700">{d.dept}</span>
                    <span className="text-xs text-ops-400">
                      {d.open} open · {d.completed} done{d.overdue > 0 && <span className="text-red-500"> · {d.overdue} overdue</span>}
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ops-100">
                      <div className="h-full bg-ops-500" style={{ width: `${(d.total / max) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority distribution + workload */}
        <div className="space-y-6">
          <div className="rounded-xl border border-ops-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-ops-900">Priority Distribution</h2>
            <div className="mt-4 flex items-end gap-4">
              {priorityDist.map((p) => {
                const max = Math.max(...priorityDist.map((x) => x.count), 1);
                const colors: Record<RequestPriority, string> = {
                  Urgent: 'bg-red-500',
                  High: 'bg-orange-500',
                  Normal: 'bg-sea-500',
                  Low: 'bg-ops-400',
                };
                return (
                  <div key={p.priority} className="flex-1">
                    <div className="flex h-24 items-end">
                      <div className={`w-full rounded-t ${colors[p.priority]} transition-all`} style={{ height: `${(p.count / max) * 100}%`, minHeight: '4px' }} />
                    </div>
                    <p className="mt-2 text-center text-xs font-medium text-ops-600">{p.priority}</p>
                    <p className="text-center text-xs text-ops-400">{p.count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-ops-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-ops-400" />
              <h2 className="text-sm font-semibold text-ops-900">Active Staff Workload</h2>
            </div>
            <div className="mt-4 space-y-2.5">
              {Object.entries(workload).length > 0 ? (
                Object.entries(workload)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm text-ops-700">{name}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ops-100">
                          <div className="h-full bg-ops-500" style={{ width: `${Math.min(count * 25, 100)}%` }} />
                        </div>
                        <span className="text-xs font-medium tabular-nums text-ops-600">{count}</span>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-ops-400">No active assignments.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overdue / urgent list */}
      <div className="rounded-xl border border-ops-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ops-900">Needs Attention</h2>
          <RouterLink to="/staff/requests" className="text-xs font-medium text-ops-600 hover:text-ops-700">All requests →</RouterLink>
        </div>
        <div className="mt-3 space-y-2">
          {overdue.length > 0 ? (
            overdue.map((r) => {
              const remaining = minutesUntil(r.slaDeadline);
              return (
                <RouterLink key={r.id} to={`/staff/requests/${r.id}`} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 transition-colors hover:bg-red-100">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-medium text-red-700">{r.shortId}</span>
                    <span className="ml-2 text-sm font-medium text-ops-800">{r.title}</span>
                    <span className="ml-2 text-xs text-ops-400">Room {r.roomNumber} · {r.department}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {r.assignedStaffName && <span className="text-ops-400">{r.assignedStaffName}</span>}
                    <span className="flex items-center gap-1 font-medium text-red-600">
                      <AlertTriangle className="h-3 w-3" /> {Math.abs(remaining)}m overdue
                    </span>
                  </div>
                </RouterLink>
              );
            })
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> No overdue requests. Everything is on track.
            </div>
          )}

          {/* Also show new/unassigned */}
          {allRequests.filter((r) => r.status === 'Submitted').map((r) => (
            <RouterLink key={r.id} to={`/staff/requests/${r.id}`} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5 transition-colors hover:bg-amber-100">
              <div className="min-w-0">
                <span className="font-mono text-xs font-medium text-amber-700">{r.shortId}</span>
                <span className="ml-2 text-sm font-medium text-ops-800">{r.title}</span>
                <span className="ml-2 text-xs text-ops-400">Room {r.roomNumber} · {timeAgo(r.createdAt)}</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-amber-700">
                <Clock className="h-3 w-3" /> Unassigned
              </span>
            </RouterLink>
          ))}
        </div>
      </div>
    </div>
  );
}

function BigStat({
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
    <div className={`rounded-xl border p-5 ${alert ? 'border-red-200 bg-red-50' : 'border-ops-200 bg-white'}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>{icon}</span>
        <div>
          <p className="text-xs font-medium text-ops-400">{label}</p>
          <p className={`text-2xl font-bold tabular-nums ${alert ? 'text-red-700' : 'text-ops-900'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
