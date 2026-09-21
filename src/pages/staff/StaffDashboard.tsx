import { useState } from 'react';
import { useStaffRequests } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { RequestCard } from '@/components/RequestCard';
import type { Department } from '@/types';
import { isOverdue, minutesUntil, getSlaInfo } from '@/utils/format';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  ClipboardList,
  UserCheck,
  Building2,
  User,
  Loader2,
  X,
  Radio,
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
  const { requests: allRequests, loading, newIncomingAlert, dismissAlert } = useStaffRequests(
    staffData?.hotelId ?? 'a0000000-0000-0000-0000-000000000001'
  );
  const [myTab, setMyTab] = useState<'active' | 'completed'>('active');

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-ops-600" />
        <p className="text-sm font-medium text-ops-500">Loading Operations Dashboard…</p>
      </div>
    );
  }

  // ---- 1. Primary Operational Metrics (calculated strictly from requests table) ----
  const newRequests = allRequests.filter((r) => r.status === 'Submitted');
  const assignedRequests = allRequests.filter((r) => r.status === 'Assigned');
  const inProgressRequests = allRequests.filter((r) => r.status === 'In Progress');
  const escalatedRequests = allRequests.filter((r) => r.status === 'Escalated');
  const overdueRequests = allRequests.filter((r) => isOverdue(r));

  const completedToday = allRequests.filter((r) => {
    if (r.status !== 'Completed' || !r.completedAt) return false;
    const d = new Date(r.completedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  // ---- 2. Immediate Attention (Urgent or Overdue) ----
  const immediateAttention = allRequests.filter(
    (r) =>
      r.status !== 'Completed' &&
      r.status !== 'Cancelled' &&
      (r.priority === 'Urgent' || isOverdue(r))
  );

  // ---- 3. My Assigned Requests ----
  const myStaffId = staffData?.staffId;
  const myStaffName = staffData?.name;
  const myRequests = allRequests.filter(
    (r) =>
      (myStaffId && r.assignedTo === myStaffId) ||
      (myStaffName && r.assignedStaffName?.toLowerCase() === myStaffName.toLowerCase())
  );

  const myActive = myRequests.filter(
    (r) => r.status === 'Assigned' || r.status === 'In Progress' || r.status === 'Escalated'
  );
  const myCompleted = myRequests.filter((r) => r.status === 'Completed');

  // ---- 4. Recent Incoming Requests ----
  const openRequests = allRequests.filter(
    (r) => r.status !== 'Completed' && r.status !== 'Cancelled'
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Realtime Alert Banner */}
      {newIncomingAlert && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm animate-slide-down">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-ping" />
            <div>
              <p className="text-sm font-semibold">New Service Request Received!</p>
              <p className="text-xs text-amber-700">
                "{newIncomingAlert.title}" {newIncomingAlert.roomNumber ? `for Room ${newIncomingAlert.roomNumber}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RouterLink
              to={`/staff/requests/${newIncomingAlert.id}`}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
            >
              View Request
            </RouterLink>
            <button
              onClick={dismissAlert}
              className="rounded p-1 text-amber-600 hover:bg-amber-100"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ops-900">Operations Center</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <Radio className="h-3 w-3 text-emerald-500 animate-pulse" /> Live Realtime
            </span>
          </div>
          <p className="mt-1 text-sm text-ops-500">
            Welcome back, <span className="font-semibold text-ops-700">{staffData?.name}</span> ({staffData?.department}). Here is what needs attention right now.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RouterLink
            to="/staff/requests"
            className="flex items-center gap-2 rounded-lg bg-ops-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-ops-800"
          >
            <ClipboardList className="h-4 w-4" /> Request Queue ({openRequests.length})
          </RouterLink>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          label="New Requests"
          value={newRequests.length}
          icon={<Inbox className="h-4 w-4" />}
          color="text-amber-700"
          bg="bg-amber-100/70"
          alert={newRequests.length > 0}
        />
        <MetricCard
          label="Assigned"
          value={assignedRequests.length}
          icon={<UserCheck className="h-4 w-4" />}
          color="text-blue-700"
          bg="bg-blue-100/70"
        />
        <MetricCard
          label="In Progress"
          value={inProgressRequests.length}
          icon={<Clock className="h-4 w-4" />}
          color="text-indigo-700"
          bg="bg-indigo-100/70"
        />
        <MetricCard
          label="Completed Today"
          value={completedToday.length}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="text-emerald-700"
          bg="bg-emerald-100/70"
        />
        <MetricCard
          label="Escalated"
          value={escalatedRequests.length}
          icon={<Flame className="h-4 w-4" />}
          color="text-rose-700"
          bg="bg-rose-100/70"
          alert={escalatedRequests.length > 0}
        />
        <MetricCard
          label="Overdue"
          value={overdueRequests.length}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="text-red-700"
          bg="bg-red-100/70"
          alert={overdueRequests.length > 0}
        />
      </div>

      {/* Immediate Attention Callout (if any urgent or overdue requests) */}
      {immediateAttention.length > 0 && (
        <section className="rounded-2xl border-2 border-red-200 bg-red-50/70 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-red-900">Requires Immediate Attention</h2>
                <p className="text-xs text-red-700">
                  {immediateAttention.length} urgent or overdue request{immediateAttention.length > 1 ? 's' : ''} currently active
                </p>
              </div>
            </div>
            <RouterLink
              to="/staff/requests"
              className="text-xs font-semibold text-red-800 hover:underline"
            >
              Filter in Queue →
            </RouterLink>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {immediateAttention.slice(0, 6).map((req) => {
              const overdue = isOverdue(req);
              const remaining = minutesUntil(req.slaDeadline);
              return (
                <RouterLink
                  key={req.id}
                  to={`/staff/requests/${req.id}`}
                  className="group block rounded-xl border border-red-200 bg-white p-4 shadow-sm transition-all hover:border-red-300 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-ops-800">{req.shortId}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        overdue
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {overdue ? `${Math.abs(remaining)}m overdue` : req.priority}
                    </span>
                  </div>
                  <h3 className="mt-2 line-clamp-1 text-sm font-bold text-ops-900 group-hover:text-red-700">
                    {req.title}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-ops-500">
                    <span>Room {req.roomNumber} · {req.department}</span>
                    <span className="font-medium text-ops-700">{req.status}</span>
                  </div>
                </RouterLink>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Grid: My Requests + Recent Incoming + Department Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: My Requests & Incoming Queue */}
        <div className="space-y-6 lg:col-span-2">
          {/* Section: My Assigned Requests */}
          <div className="rounded-2xl border border-ops-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ops-100 text-ops-700">
                  <User className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-ops-900">My Requests</h2>
                  <p className="text-xs text-ops-400">Requests assigned to {staffData?.name}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex rounded-lg bg-ops-100 p-1 text-xs font-medium">
                <button
                  onClick={() => setMyTab('active')}
                  className={`rounded-md px-3 py-1.5 transition-all ${
                    myTab === 'active'
                      ? 'bg-white text-ops-900 shadow-sm font-semibold'
                      : 'text-ops-600 hover:text-ops-900'
                  }`}
                >
                  Active ({myActive.length})
                </button>
                <button
                  onClick={() => setMyTab('completed')}
                  className={`rounded-md px-3 py-1.5 transition-all ${
                    myTab === 'completed'
                      ? 'bg-white text-ops-900 shadow-sm font-semibold'
                      : 'text-ops-600 hover:text-ops-900'
                  }`}
                >
                  Completed ({myCompleted.length})
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {myTab === 'active' && myActive.length === 0 && (
                <div className="rounded-xl border border-dashed border-ops-200 bg-ops-50/50 p-6 text-center">
                  <UserCheck className="mx-auto h-6 w-6 text-ops-400" />
                  <p className="mt-1 text-xs font-medium text-ops-600">No active requests assigned to you.</p>
                  <p className="mt-0.5 text-[11px] text-ops-400">Check incoming requests below to accept new work.</p>
                </div>
              )}

              {myTab === 'active' &&
                myActive.map((req) => (
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

              {myTab === 'completed' && myCompleted.length === 0 && (
                <div className="rounded-xl border border-dashed border-ops-200 bg-ops-50/50 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-ops-400" />
                  <p className="mt-1 text-xs font-medium text-ops-600">No completed requests yet today.</p>
                </div>
              )}

              {myTab === 'completed' &&
                myCompleted.slice(0, 5).map((req) => (
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
            </div>
          </div>

          {/* Section: Incoming Requests Queue */}
          <div className="rounded-2xl border border-ops-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ops-900">Incoming & Open Requests</h2>
                <p className="text-xs text-ops-400">
                  {newRequests.length} new awaiting assignment · {openRequests.length} total active
                </p>
              </div>
              <RouterLink
                to="/staff/requests"
                className="flex items-center gap-1 text-xs font-semibold text-ops-700 hover:text-ops-900 hover:underline"
              >
                View Full Queue <ArrowRight className="h-3 w-3" />
              </RouterLink>
            </div>

            <div className="space-y-3">
              {openRequests.slice(0, 6).map((req) => (
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

              {openRequests.length === 0 && (
                <div className="rounded-xl border border-dashed border-ops-200 bg-ops-50 p-8 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                  <p className="mt-2 text-sm font-semibold text-ops-800">All caught up!</p>
                  <p className="text-xs text-ops-400">No open requests currently pending in the hotel.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Department Activity & SLA Monitoring */}
        <div className="space-y-6">
          {/* Department Activity */}
          <div className="rounded-2xl border border-ops-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-ops-600" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-ops-600">
                Department Activity
              </h2>
            </div>

            <div className="space-y-3.5">
              {DEPARTMENTS.map((dept) => {
                const deptReqs = allRequests.filter((r) => r.department === dept);
                const deptOpen = deptReqs.filter(
                  (r) => r.status !== 'Completed' && r.status !== 'Cancelled'
                ).length;
                const deptOverdue = deptReqs.filter((r) => isOverdue(r)).length;
                const max = Math.max(
                  ...DEPARTMENTS.map(
                    (d) =>
                      allRequests.filter(
                        (r) =>
                          r.department === d &&
                          r.status !== 'Completed' &&
                          r.status !== 'Cancelled'
                      ).length
                  ),
                  1
                );

                const isMyDept = staffData?.department === dept;

                return (
                  <div key={dept} className={`rounded-lg p-2 transition-colors ${isMyDept ? 'bg-ops-50 ring-1 ring-ops-200' : ''}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${isMyDept ? 'text-ops-900' : 'text-ops-700'}`}>
                        {dept} {isMyDept && <span className="ml-1 text-[10px] text-ops-500 font-normal">(Yours)</span>}
                      </span>
                      <span className="text-ops-500">
                        <span className="font-semibold text-ops-800">{deptOpen}</span> open
                        {deptOverdue > 0 && (
                          <span className="ml-1.5 font-bold text-red-600">· {deptOverdue} overdue</span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ops-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          deptOverdue > 0 ? 'bg-red-500' : 'bg-ops-700'
                        }`}
                        style={{ width: `${Math.min((deptOpen / max) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SLA Tracking Overview */}
          <div className="rounded-2xl border border-ops-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ops-600 mb-3">
              Active SLA Status
            </h2>
            <div className="space-y-2.5">
              {openRequests.slice(0, 5).map((r) => {
                const sla = getSlaInfo(r);
                return (
                  <RouterLink
                    key={r.id}
                    to={`/staff/requests/${r.id}`}
                    className="block rounded-xl border border-ops-100 p-3 transition-colors hover:bg-ops-50"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-ops-700">{r.shortId}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          sla.isOverdue
                            ? 'bg-red-100 text-red-700'
                            : sla.condition === 'approaching'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {sla.formattedText}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-ops-900">{r.title}</p>
                    <p className="text-[11px] text-ops-400">Room {r.roomNumber} · {r.department}</p>
                  </RouterLink>
                );
              })}
              {openRequests.length === 0 && (
                <p className="text-xs text-ops-400">No active SLA deadlines to monitor.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
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
    <div
      className={`rounded-xl border p-4 shadow-sm transition-all ${
        alert ? 'border-red-200 bg-red-50/70' : 'border-ops-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg} ${color}`}>
          {icon}
        </span>
        <span className="text-xs font-medium text-ops-500">{label}</span>
      </div>
      <p className={`mt-2.5 text-2xl font-bold tabular-nums tracking-tight ${alert ? 'text-red-700' : 'text-ops-900'}`}>
        {value}
      </p>
    </div>
  );
}
