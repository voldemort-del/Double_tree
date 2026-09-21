import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  useManagerData,
  filterRequestsByRange,
  type TimeRange,
} from '@/hooks/useManagerStore';
import { useStaffActions } from '@/hooks/useStore';
import type { HotelRequest, RequestStatus, RequestPriority, Department } from '@/types';
import {
  isOverdue,
  minutesUntil,
  getSlaInfo,
  timeAgo,
  formatDateTime,
  statusColor,
  priorityColor,
  departmentColor,
  initials,
} from '@/utils/format';
import { RouterLink, navigate } from '@/utils/router';
import { StatusBadge, PriorityBadge, DepartmentBadge } from '@/components/Badges';
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  TrendingUp,
  Users,
  Activity,
  BarChart3,
  Flame,
  Shield,
  ArrowRight,
  UtensilsCrossed,
  Search,
  Filter,
  X,
  UserPlus,
  ChevronDown,
  Radio,
  Circle,
  Bot,
  User,
  Building,
  RefreshCw,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

type ManagerTab = 'overview' | 'requests' | 'staff' | 'sla' | 'escalations' | 'activity';

// ============================================================
// Root component
// ============================================================

export function ManagerView() {
  const { staffData } = useAuth();
  const [tab, setTab] = useState<ManagerTab>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const hotelId = staffData?.hotelId ?? '';
  const store = useManagerData(hotelId, timeRange);
  const { requests, staffList, activity, deptMetrics, staffWorkload, slaMetrics, dailyTrend, loading, error, refresh } = store;

  // Always show current active state for KPIs (not range-filtered)
  const activeRequests = requests.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled');
  const rangedRequests = filterRequestsByRange(requests, timeRange);

  const kpi = useMemo(() => {
    const today = new Date().toDateString();
    return {
      totalActive: activeRequests.length,
      submitted: requests.filter((r) => r.status === 'Submitted').length,
      assigned: requests.filter((r) => r.status === 'Assigned').length,
      inProgress: requests.filter((r) => r.status === 'In Progress').length,
      completedToday: requests.filter(
        (r) => r.status === 'Completed' && r.completedAt && new Date(r.completedAt).toDateString() === today,
      ).length,
      escalated: requests.filter((r) => r.status === 'Escalated').length,
      overdue: requests.filter((r) => isOverdue(r)).length,
      urgent: requests.filter(
        (r) => r.priority === 'Urgent' && r.status !== 'Completed' && r.status !== 'Cancelled',
      ).length,
    };
  }, [requests, activeRequests.length]);

  if (!staffData) return null;

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-ops-600" />
        <p className="text-sm font-medium text-ops-500">Loading Operations Command Centre…</p>
      </div>
    );
  }

  const TABS: { id: ManagerTab; label: string; icon: React.ReactNode; alert?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'requests', label: 'Requests', icon: <Inbox className="h-4 w-4" /> },
    { id: 'staff', label: 'Staff', icon: <Users className="h-4 w-4" /> },
    { id: 'sla', label: 'SLA', icon: <Shield className="h-4 w-4" /> },
    { id: 'escalations', label: 'Escalations', icon: <Flame className="h-4 w-4" />, alert: kpi.escalated + kpi.overdue > 0 },
    { id: 'activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs font-medium text-ops-400">Live Operations</p>
          </div>
          <h1 className="mt-1 text-xl font-bold text-ops-900">Manager Operations Centre</h1>
          <p className="text-sm text-ops-400">Hotel-wide operational visibility · DoubleTree by Hilton Malta</p>
        </div>

        {/* Time range + menu + refresh */}
        <div className="flex items-center gap-2">
          <RouterLink
            to="/staff/menu"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ops-200 bg-white px-3 py-1.5 text-xs font-semibold text-ops-700 shadow-sm hover:bg-ops-50 transition-colors"
          >
            <UtensilsCrossed className="h-3.5 w-3.5 text-ops-500" />
            <span>Manage Menu & Bar</span>
          </RouterLink>

          <div className="flex rounded-lg border border-ops-200 bg-white text-xs font-medium overflow-hidden">
            {(['today', '7d', '30d'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 transition-colors ${
                  timeRange === r ? 'bg-ops-900 text-white' : 'text-ops-500 hover:bg-ops-50'
                }`}
              >
                {r === 'today' ? 'Today' : r === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ops-200 bg-white text-ops-400 transition-colors hover:bg-ops-50 hover:text-ops-700"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Active Requests" value={kpi.totalActive} icon={<Inbox className="h-5 w-5" />} color="text-ops-700" bg="bg-ops-100" />
        <KpiCard label="New / Unassigned" value={kpi.submitted} icon={<Circle className="h-5 w-5" />} color="text-amber-700" bg="bg-amber-50" alert={kpi.submitted > 0} />
        <KpiCard label="In Progress" value={kpi.inProgress} icon={<Clock className="h-5 w-5" />} color="text-indigo-700" bg="bg-indigo-50" />
        <KpiCard label="Completed Today" value={kpi.completedToday} icon={<CheckCircle2 className="h-5 w-5" />} color="text-emerald-700" bg="bg-emerald-50" />
        <KpiCard label="Escalated" value={kpi.escalated} icon={<AlertTriangle className="h-5 w-5" />} color="text-red-700" bg="bg-red-50" alert={kpi.escalated > 0} />
        <KpiCard label="Overdue" value={kpi.overdue} icon={<AlertTriangle className="h-5 w-5" />} color="text-red-700" bg="bg-red-50" alert={kpi.overdue > 0} />
        <KpiCard label="Urgent" value={kpi.urgent} icon={<Flame className="h-5 w-5" />} color="text-orange-700" bg="bg-orange-50" alert={kpi.urgent > 0} />
        <KpiCard label="SLA Compliance" value={`${slaMetrics.complianceRate}%`} icon={<TrendingUp className="h-5 w-5" />} color={slaMetrics.complianceRate >= 80 ? 'text-emerald-700' : 'text-red-700'} bg={slaMetrics.complianceRate >= 80 ? 'bg-emerald-50' : 'bg-red-50'} />
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-ops-200 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-b-2 border-ops-900 text-ops-900'
                : 'text-ops-500 hover:text-ops-700'
            }`}
          >
            {t.icon}
            {t.label}
            {t.alert && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'overview' && (
          <OverviewTab
            requests={requests}
            rangedRequests={rangedRequests}
            deptMetrics={deptMetrics}
            dailyTrend={dailyTrend}
            timeRange={timeRange}
          />
        )}
        {tab === 'requests' && (
          <RequestsTab requests={requests} staffList={staffList} refresh={refresh} />
        )}
        {tab === 'staff' && (
          <StaffTab staffWorkload={staffWorkload} />
        )}
        {tab === 'sla' && (
          <SlaTab requests={requests} slaMetrics={slaMetrics} />
        )}
        {tab === 'escalations' && (
          <EscalationsTab requests={requests} />
        )}
        {tab === 'activity' && (
          <ActivityTab activity={activity} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// KPI Card
// ============================================================

function KpiCard({
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
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-ops-400">{label}</p>
          <p className={`text-2xl font-bold tabular-nums ${alert ? 'text-red-700' : 'text-ops-900'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Overview Tab
// ============================================================

function OverviewTab({
  requests,
  rangedRequests,
  deptMetrics,
  dailyTrend,
  timeRange,
}: {
  requests: HotelRequest[];
  rangedRequests: HotelRequest[];
  deptMetrics: ReturnType<typeof filterRequestsByRange> extends infer T ? any : any;
  dailyTrend: { date: string; count: number }[];
  timeRange: TimeRange;
}) {
  const needsAttention = requests.filter(
    (r) =>
      r.status !== 'Completed' &&
      r.status !== 'Cancelled' &&
      (r.priority === 'Urgent' || isOverdue(r) || r.status === 'Escalated'),
  );

  const priorityCounts: Record<RequestPriority, number> = {
    Urgent: rangedRequests.filter((r) => r.priority === 'Urgent').length,
    High: rangedRequests.filter((r) => r.priority === 'High').length,
    Normal: rangedRequests.filter((r) => r.priority === 'Normal').length,
    Low: rangedRequests.filter((r) => r.priority === 'Low').length,
  };

  const statusCounts: Record<string, number> = {
    Submitted: rangedRequests.filter((r) => r.status === 'Submitted').length,
    Assigned: rangedRequests.filter((r) => r.status === 'Assigned').length,
    'In Progress': rangedRequests.filter((r) => r.status === 'In Progress').length,
    Completed: rangedRequests.filter((r) => r.status === 'Completed').length,
    Escalated: rangedRequests.filter((r) => r.status === 'Escalated').length,
    Cancelled: rangedRequests.filter((r) => r.status === 'Cancelled').length,
  };

  const maxDeptTotal = Math.max(...deptMetrics.map((d: any) => d.total), 1);
  const maxTrend = Math.max(...dailyTrend.map((d) => d.count), 1);
  const maxPriority = Math.max(...Object.values(priorityCounts), 1);

  const rangeLabel = timeRange === 'today' ? 'today' : timeRange === '7d' ? 'last 7 days' : 'last 30 days';

  return (
    <div className="space-y-5">
      {/* Immediate Attention */}
      <SectionCard
        title="Immediate Attention"
        subtitle={`${needsAttention.length} request${needsAttention.length !== 1 ? 's' : ''} requiring action`}
        icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
      >
        {needsAttention.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-8 w-8 text-emerald-400" />} message="No urgent or overdue requests. Operations are running smoothly." />
        ) : (
          <div className="space-y-2">
            {needsAttention.slice(0, 8).map((r) => (
              <AttentionRow key={r.id} request={r} />
            ))}
            {needsAttention.length > 8 && (
              <p className="text-center text-xs text-ops-400 pt-1">+{needsAttention.length - 8} more in Requests tab</p>
            )}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Department Performance */}
        <SectionCard title={`Department Activity (${rangeLabel})`} subtitle="Active workload by department" icon={<Building className="h-4 w-4 text-ops-400" />}>
          {rangedRequests.length === 0 ? (
            <EmptyState message={`No requests in the ${rangeLabel}.`} />
          ) : (
            <div className="space-y-4">
              {deptMetrics.map((d: any) => (
                <div key={d.department}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ops-800">{d.department}</span>
                    <span className="text-xs text-ops-400">
                      {d.active > 0 && <span className="text-ops-600 font-medium">{d.active} active</span>}
                      {d.active > 0 && d.completed > 0 && <span className="mx-1">·</span>}
                      {d.completed > 0 && <span>{d.completed} done</span>}
                      {d.overdue > 0 && <span className="ml-1 text-red-500 font-medium">· {d.overdue} overdue</span>}
                      {d.total === 0 && <span className="text-ops-300">No activity</span>}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ops-100">
                    <div
                      className="h-full rounded-full bg-ops-600 transition-all duration-500"
                      style={{ width: `${(d.total / maxDeptTotal) * 100}%` }}
                    />
                  </div>
                  {d.avgCompletionMinutes !== null && (
                    <p className="mt-0.5 text-xs text-ops-400">
                      Avg completion: {d.avgCompletionMinutes >= 60
                        ? `${Math.floor(d.avgCompletionMinutes / 60)}h ${d.avgCompletionMinutes % 60}m`
                        : `${d.avgCompletionMinutes}m`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-5">
          {/* Priority Distribution */}
          <SectionCard title={`Priority Distribution (${rangeLabel})`} icon={<Flame className="h-4 w-4 text-ops-400" />}>
            {rangedRequests.length === 0 ? (
              <EmptyState message="No data for this period." />
            ) : (
              <div className="flex items-end gap-3 h-28 pt-4">
                {(Object.entries(priorityCounts) as [RequestPriority, number][]).map(([p, count]) => {
                  const colors: Record<RequestPriority, string> = {
                    Urgent: 'bg-red-500',
                    High: 'bg-orange-400',
                    Normal: 'bg-sea-500',
                    Low: 'bg-ops-300',
                  };
                  return (
                    <div key={p} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-xs font-bold tabular-nums text-ops-600">{count}</span>
                      <div className="w-full flex items-end" style={{ height: '64px' }}>
                        <div
                          className={`w-full rounded-t transition-all duration-500 ${colors[p]}`}
                          style={{ height: `${Math.max((count / maxPriority) * 100, count > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-ops-500">{p}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Status Breakdown */}
          <SectionCard title="Status Breakdown" icon={<Activity className="h-4 w-4 text-ops-400" />}>
            {rangedRequests.length === 0 ? (
              <EmptyState message="No data for this period." />
            ) : (
              <div className="space-y-2">
                {Object.entries(statusCounts)
                  .filter(([, v]) => v > 0)
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor(status as RequestStatus)}`}>
                        {status}
                      </span>
                      <span className="font-semibold tabular-nums text-ops-800">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Daily Trend */}
      {dailyTrend.length > 1 && (
        <SectionCard title={`Requests Created (${rangeLabel})`} icon={<TrendingUp className="h-4 w-4 text-ops-400" />}>
          {rangedRequests.length === 0 ? (
            <EmptyState message="No requests in this period." />
          ) : (
            <div className="flex items-end gap-1 h-24">
              {dailyTrend.map((bucket) => (
                <div key={bucket.date} className="flex flex-1 flex-col items-center gap-0.5" title={`${bucket.date}: ${bucket.count}`}>
                  <div className="w-full flex items-end" style={{ height: '64px' }}>
                    <div
                      className="w-full rounded-t bg-ops-500 opacity-80 hover:opacity-100 transition-opacity"
                      style={{ height: `${Math.max((bucket.count / maxTrend) * 100, bucket.count > 0 ? 10 : 0)}%`, minHeight: '2px' }}
                    />
                  </div>
                  <span className="text-[9px] text-ops-400 truncate w-full text-center">{bucket.date.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

function AttentionRow({ request }: { request: HotelRequest }) {
  const sla = getSlaInfo(request);
  const borderClass =
    request.status === 'Escalated'
      ? 'border-red-200 bg-red-50 hover:bg-red-100'
      : sla.isOverdue
      ? 'border-orange-200 bg-orange-50 hover:bg-orange-100'
      : 'border-amber-100 bg-amber-50 hover:bg-amber-100';

  return (
    <RouterLink
      to={`/staff/requests/${request.id}`}
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${borderClass}`}
    >
      <div className="min-w-0 flex items-center gap-2">
        <span className="font-mono text-xs font-medium text-ops-500">{request.shortId}</span>
        <span className="text-sm font-medium text-ops-900 truncate">{request.title}</span>
        <span className="hidden text-xs text-ops-400 sm:inline">
          Rm {request.roomNumber} · {request.department}
        </span>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <PriorityBadge priority={request.priority} />
        <StatusBadge status={request.status} />
        {sla.isOverdue && (
          <span className="text-xs font-medium text-red-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {Math.abs(sla.minutesRemaining)}m
          </span>
        )}
      </div>
    </RouterLink>
  );
}

// ============================================================
// Requests Tab — full manager request table with actions
// ============================================================

const ALL_STATUSES: ('All' | RequestStatus)[] = ['All', 'Submitted', 'Assigned', 'In Progress', 'Escalated', 'Completed', 'Cancelled'];
const ALL_PRIORITIES: ('All' | RequestPriority)[] = ['All', 'Urgent', 'High', 'Normal', 'Low'];
const ALL_DEPTS: ('All' | Department)[] = ['All', 'Front Desk', 'Housekeeping', 'Maintenance', 'Food & Beverage', 'Concierge', 'Spa & Wellness'];

function RequestsTab({
  requests,
  staffList,
  refresh,
}: {
  requests: HotelRequest[];
  staffList: { id: string; first_name: string; last_name: string; role: string }[];
  refresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | RequestStatus>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | RequestPriority>('All');
  const [deptFilter, setDeptFilter] = useState<'All' | Department>('All');
  const [slaFilter, setSlaFilter] = useState<'All' | 'Overdue' | 'Approaching' | 'On Track'>('All');
  const [assignAction, setAssignAction] = useState<{ requestId: string; currentName?: string } | null>(null);
  const { updateStatus, assignRequest, escalateRequest } = useStaffActions();
  const [acting, setActing] = useState<string | null>(null);

  const staffOnly = staffList.filter((s) => s.role === 'staff');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && r.priority !== priorityFilter) return false;
      if (deptFilter !== 'All' && r.department !== deptFilter) return false;
      if (slaFilter !== 'All') {
        const sla = getSlaInfo(r);
        if (slaFilter === 'Overdue' && !sla.isOverdue) return false;
        if (slaFilter === 'Approaching' && sla.condition !== 'approaching') return false;
        if (slaFilter === 'On Track' && sla.condition !== 'on_track') return false;
      }
      if (q) {
        return (
          r.title.toLowerCase().includes(q) ||
          (r.guestName ?? '').toLowerCase().includes(q) ||
          r.roomNumber.includes(q) ||
          r.shortId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requests, search, statusFilter, priorityFilter, deptFilter, slaFilter]);

  async function handleAssign(requestId: string, staffId: string, staffName: string) {
    setActing(requestId);
    await assignRequest(requestId, staffId, staffName);
    setActing(null);
    setAssignAction(null);
    refresh();
  }

  async function handleEscalate(requestId: string) {
    setActing(requestId);
    await escalateRequest(requestId);
    setActing(null);
    refresh();
  }

  async function handleStatus(requestId: string, status: RequestStatus) {
    setActing(requestId);
    await updateStatus(requestId, status);
    setActing(null);
    refresh();
  }

  const activeFiltersCount = [
    statusFilter !== 'All',
    priorityFilter !== 'All',
    deptFilter !== 'All',
    slaFilter !== 'All',
    search.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-400" />
          <input
            type="text"
            placeholder="Search by title, guest, room, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-ops-200 bg-white py-2 pl-9 pr-3 text-sm text-ops-800 placeholder:text-ops-400 focus:border-ops-400 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ops-400 hover:text-ops-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <SelectFilter label="Status" value={statusFilter} options={ALL_STATUSES} onChange={(v) => setStatusFilter(v as any)} />
        <SelectFilter label="Priority" value={priorityFilter} options={ALL_PRIORITIES} onChange={(v) => setPriorityFilter(v as any)} />
        <SelectFilter label="Department" value={deptFilter} options={ALL_DEPTS} onChange={(v) => setDeptFilter(v as any)} />
        <SelectFilter label="SLA" value={slaFilter} options={['All', 'Overdue', 'Approaching', 'On Track']} onChange={(v) => setSlaFilter(v as any)} />
        {activeFiltersCount > 0 && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('All'); setPriorityFilter('All'); setDeptFilter('All'); setSlaFilter('All'); }}
            className="flex items-center gap-1 text-xs font-medium text-ops-500 hover:text-ops-700"
          >
            <X className="h-3 w-3" />Clear ({activeFiltersCount})
          </button>
        )}
      </div>

      <p className="text-xs text-ops-400">{filtered.length} of {requests.length} requests</p>

      {/* Request rows */}
      {filtered.length === 0 ? (
        <EmptyState message="No requests match the current filters." />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const sla = getSlaInfo(r);
            const isActing = acting === r.id;
            const canEscalate = r.status !== 'Completed' && r.status !== 'Cancelled' && r.status !== 'Escalated';
            const canComplete = r.status === 'In Progress' || r.status === 'Assigned';
            const canCancel = r.status !== 'Completed' && r.status !== 'Cancelled';

            return (
              <div
                key={r.id}
                className={`rounded-xl border bg-white p-4 ${sla.isOverdue ? 'border-red-200' : 'border-ops-200'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-medium text-ops-400">{r.shortId}</span>
                      <RouterLink to={`/staff/requests/${r.id}`} className="text-sm font-semibold text-ops-900 hover:text-ops-700 transition-colors">
                        {r.title}
                      </RouterLink>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ops-500">
                      {r.guestName && <span>👤 {r.guestName}</span>}
                      <span>🏨 Rm {r.roomNumber}</span>
                      <DepartmentBadge department={r.department} />
                      {r.assignedStaffName && <span>→ {r.assignedStaffName}</span>}
                      <span className="text-ops-400">{timeAgo(r.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={r.priority} />
                    <StatusBadge status={r.status} />
                    {sla.isOverdue ? (
                      <span className="text-xs font-medium text-red-600">⏰ {Math.abs(sla.minutesRemaining)}m overdue</span>
                    ) : sla.condition === 'approaching' ? (
                      <span className="text-xs font-medium text-orange-600">⚠ {sla.formattedText}</span>
                    ) : null}
                  </div>
                </div>

                {/* Manager action bar */}
                {isActing ? (
                  <div className="mt-3 flex items-center gap-2 border-t border-ops-100 pt-3">
                    <Loader2 className="h-4 w-4 animate-spin text-ops-400" />
                    <span className="text-xs text-ops-400">Processing…</span>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ops-100 pt-3">
                    <button
                      onClick={() => setAssignAction({ requestId: r.id, currentName: r.assignedStaffName })}
                      className="flex items-center gap-1 rounded-md border border-ops-200 bg-ops-50 px-2.5 py-1 text-xs font-medium text-ops-700 hover:bg-ops-100 transition-colors"
                    >
                      <UserPlus className="h-3 w-3" />
                      {r.assignedStaffName ? 'Reassign' : 'Assign'}
                    </button>
                    {canEscalate && (
                      <button
                        onClick={() => handleEscalate(r.id)}
                        className="flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
                      >
                        <AlertTriangle className="h-3 w-3" />Escalate
                      </button>
                    )}
                    {canComplete && (
                      <button
                        onClick={() => handleStatus(r.id, 'Completed')}
                        className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle2 className="h-3 w-3" />Complete
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => handleStatus(r.id, 'Cancelled')}
                        className="flex items-center gap-1 rounded-md border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <X className="h-3 w-3" />Cancel
                      </button>
                    )}
                    <RouterLink
                      to={`/staff/requests/${r.id}`}
                      className="ml-auto flex items-center gap-1 text-xs font-medium text-ops-500 hover:text-ops-700"
                    >
                      Full detail <ArrowRight className="h-3 w-3" />
                    </RouterLink>
                  </div>
                )}

                {/* Inline assign picker */}
                {assignAction?.requestId === r.id && (
                  <div className="mt-3 rounded-lg border border-ops-200 bg-ops-50 p-3 animate-slide-up">
                    <p className="mb-2 text-xs font-medium text-ops-600">Assign to staff member:</p>
                    <div className="flex flex-wrap gap-2">
                      {staffOnly.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleAssign(r.id, s.id, `${s.first_name} ${s.last_name}`)}
                          className="flex items-center gap-1.5 rounded-lg border border-ops-200 bg-white px-3 py-1.5 text-xs font-medium text-ops-700 transition-colors hover:border-ops-400 hover:bg-ops-100"
                        >
                          <User className="h-3 w-3" />
                          {s.first_name} {s.last_name}
                        </button>
                      ))}
                      <button
                        onClick={() => setAssignAction(null)}
                        className="text-xs text-ops-400 hover:text-ops-600 px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Staff Tab
// ============================================================

function StaffTab({ staffWorkload }: { staffWorkload: any[] }) {
  const hasData = staffWorkload.some((s) => s.total > 0);

  return (
    <SectionCard
      title="Staff Workload"
      subtitle="Current operational workload distribution across all staff members"
      icon={<Users className="h-4 w-4 text-ops-400" />}
    >
      {staffWorkload.length === 0 ? (
        <EmptyState message="No staff profiles found." />
      ) : !hasData ? (
        <div>
          <EmptyState message="No requests currently assigned to staff." />
          <div className="mt-4 divide-y divide-ops-100">
            {staffWorkload.map((s) => (
              <div key={s.staffId} className="flex items-center gap-3 py-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ops-100 text-xs font-semibold text-ops-600">
                  {initials(s.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-ops-800">{s.name}</p>
                  <p className="text-xs text-ops-400">{s.department}</p>
                </div>
                <span className="ml-auto text-xs text-ops-400">No active assignments</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ops-100">
                {['Staff Member', 'Department', 'Active', 'In Progress', 'Overdue', 'Done Today'].map((h) => (
                  <th key={h} className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-ops-400 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ops-50">
              {staffWorkload.map((s) => (
                <tr key={s.staffId} className="hover:bg-ops-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ops-100 text-xs font-semibold text-ops-600">
                        {initials(s.name)}
                      </div>
                      <span className="font-medium text-ops-900">{s.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-xs text-ops-500">{s.department}</td>
                  <td className="py-3 pr-4">
                    <span className={`font-semibold tabular-nums ${s.active > 0 ? 'text-ops-900' : 'text-ops-300'}`}>
                      {s.active}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`font-semibold tabular-nums ${s.inProgress > 0 ? 'text-indigo-600' : 'text-ops-300'}`}>
                      {s.inProgress}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {s.overdue > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-red-600">
                        <AlertTriangle className="h-3 w-3" />{s.overdue}
                      </span>
                    ) : (
                      <span className="text-ops-300">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    <span className={`font-semibold tabular-nums ${s.completedToday > 0 ? 'text-emerald-600' : 'text-ops-300'}`}>
                      {s.completedToday > 0 ? s.completedToday : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

// ============================================================
// SLA Tab
// ============================================================

function SlaTab({ requests, slaMetrics }: { requests: HotelRequest[]; slaMetrics: any }) {
  const active = requests.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled');
  const overdue = active.filter((r) => isOverdue(r));
  const approaching = active.filter((r) => !isOverdue(r) && minutesUntil(r.slaDeadline) <= 15);
  const onTrack = active.filter((r) => !isOverdue(r) && minutesUntil(r.slaDeadline) > 15);

  return (
    <div className="space-y-5">
      {/* SLA summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SlaCard label="On Track" value={slaMetrics.onTrack} color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200" />
        <SlaCard label="Approaching Deadline" value={slaMetrics.approaching} color="text-orange-700" bg="bg-orange-50" border="border-orange-200" alert={slaMetrics.approaching > 0} />
        <SlaCard label="Overdue" value={slaMetrics.overdue} color="text-red-700" bg="bg-red-50" border="border-red-200" alert={slaMetrics.overdue > 0} />
        <SlaCard label="Completed On Time" value={slaMetrics.completedOnTime} color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200" />
        <SlaCard label="Completed Late" value={slaMetrics.completedLate} color="text-red-600" bg="bg-red-50" border="border-red-200" alert={slaMetrics.completedLate > 0} />
        <div className={`rounded-xl border p-4 ${slaMetrics.complianceRate >= 80 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <p className="text-xs font-medium text-ops-500">SLA Compliance Rate</p>
          <p className={`text-3xl font-bold tabular-nums ${slaMetrics.complianceRate >= 80 ? 'text-emerald-700' : 'text-red-700'}`}>
            {slaMetrics.complianceRate}%
          </p>
        </div>
      </div>

      {/* Overdue list */}
      <SectionCard
        title={`Overdue Requests (${overdue.length})`}
        icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
      >
        {overdue.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-7 w-7 text-emerald-400" />} message="No overdue requests. SLA compliance is on track." />
        ) : (
          <div className="space-y-2">
            {overdue.map((r) => <SlaRow key={r.id} request={r} />)}
          </div>
        )}
      </SectionCard>

      {/* Approaching list */}
      {approaching.length > 0 && (
        <SectionCard title={`Approaching Deadline (${approaching.length})`} icon={<Clock className="h-4 w-4 text-orange-500" />}>
          <div className="space-y-2">
            {approaching.map((r) => <SlaRow key={r.id} request={r} />)}
          </div>
        </SectionCard>
      )}

      {/* On track preview */}
      {onTrack.length > 0 && (
        <SectionCard title={`On Track (${onTrack.length})`} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}>
          <div className="space-y-2">
            {onTrack.slice(0, 5).map((r) => <SlaRow key={r.id} request={r} />)}
            {onTrack.length > 5 && (
              <p className="text-xs text-ops-400 text-center pt-1">+{onTrack.length - 5} more on track</p>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function SlaCard({ label, value, color, bg, border, alert }: { label: string; value: number; color: string; bg: string; border: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${alert ? `${border} ${bg}` : 'border-ops-200 bg-white'}`}>
      <p className="text-xs font-medium text-ops-500">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${alert ? color : 'text-ops-900'}`}>{value}</p>
    </div>
  );
}

function SlaRow({ request: r }: { request: HotelRequest }) {
  const sla = getSlaInfo(r);
  return (
    <RouterLink
      to={`/staff/requests/${r.id}`}
      className="flex items-center justify-between rounded-lg border border-ops-100 bg-ops-50 px-3 py-2.5 text-sm hover:bg-ops-100 transition-colors"
    >
      <div className="min-w-0 flex items-center gap-2">
        <span className="font-mono text-xs text-ops-400">{r.shortId}</span>
        <span className="font-medium text-ops-900 truncate">{r.title}</span>
        <span className="hidden text-xs text-ops-400 sm:inline">Rm {r.roomNumber} · {r.department}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {r.assignedStaffName && <span className="text-xs text-ops-400">{r.assignedStaffName}</span>}
        <span className={`text-xs font-medium ${sla.isOverdue ? 'text-red-600' : sla.condition === 'approaching' ? 'text-orange-600' : 'text-emerald-600'}`}>
          {sla.formattedText}
        </span>
      </div>
    </RouterLink>
  );
}

// ============================================================
// Escalations Tab
// ============================================================

function EscalationsTab({ requests }: { requests: HotelRequest[] }) {
  const escalated = requests.filter((r) => r.status === 'Escalated');
  const urgentOpen = requests.filter(
    (r) => r.priority === 'Urgent' && r.status !== 'Completed' && r.status !== 'Cancelled' && r.status !== 'Escalated',
  );
  const overdueUrgent = requests.filter(
    (r) => r.priority === 'Urgent' && isOverdue(r) && r.status !== 'Completed' && r.status !== 'Cancelled',
  );

  const total = escalated.length + urgentOpen.length + overdueUrgent.length;

  return (
    <div className="space-y-5">
      {total === 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="mt-3 text-sm font-medium text-emerald-700">No active escalations or critical issues.</p>
          <p className="mt-1 text-xs text-emerald-600">All requests are within normal operational parameters.</p>
        </div>
      )}

      {escalated.length > 0 && (
        <SectionCard
          title={`Escalated Requests (${escalated.length})`}
          subtitle="These requests have been formally escalated and require manager attention"
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        >
          <div className="space-y-3">
            {escalated.map((r) => <EscalationRow key={r.id} request={r} highlight="red" />)}
          </div>
        </SectionCard>
      )}

      {urgentOpen.length > 0 && (
        <SectionCard
          title={`Urgent Open Requests (${urgentOpen.length})`}
          subtitle="High-priority requests not yet escalated that may need immediate attention"
          icon={<Flame className="h-4 w-4 text-orange-500" />}
        >
          <div className="space-y-3">
            {urgentOpen.map((r) => <EscalationRow key={r.id} request={r} highlight="orange" />)}
          </div>
        </SectionCard>
      )}

      {overdueUrgent.length > 0 && (
        <SectionCard
          title={`Overdue Urgent Requests (${overdueUrgent.length})`}
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
        >
          <div className="space-y-3">
            {overdueUrgent.map((r) => <EscalationRow key={r.id} request={r} highlight="red" />)}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function EscalationRow({ request: r, highlight }: { request: HotelRequest; highlight: 'red' | 'orange' }) {
  const sla = getSlaInfo(r);
  const border = highlight === 'red' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50';
  return (
    <RouterLink
      to={`/staff/requests/${r.id}`}
      className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 transition-colors hover:opacity-90 ${border}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-medium text-ops-500">{r.shortId}</span>
          <span className="font-semibold text-ops-900">{r.title}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ops-500">
          {r.guestName && <span>👤 {r.guestName}</span>}
          <span>🏨 Rm {r.roomNumber}</span>
          <DepartmentBadge department={r.department} />
          {r.assignedStaffName
            ? <span className="text-ops-600">→ {r.assignedStaffName}</span>
            : <span className="font-medium text-red-600">Unassigned</span>
          }
          <span>{timeAgo(r.createdAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <PriorityBadge priority={r.priority} />
        <StatusBadge status={r.status} />
        <span className={`text-xs font-medium ${sla.isOverdue ? 'text-red-700' : 'text-orange-600'}`}>
          {sla.formattedText}
        </span>
        <ArrowRight className="h-4 w-4 text-ops-400" />
      </div>
    </RouterLink>
  );
}

// ============================================================
// Activity Tab
// ============================================================

function ActivityTab({ activity }: { activity: any[] }) {
  if (activity.length === 0) {
    return <EmptyState message="No recent activity. Events will appear here as requests are created and updated." />;
  }

  return (
    <SectionCard title="Recent Activity" subtitle="Latest events across all requests" icon={<Activity className="h-4 w-4 text-ops-400" />}>
      <div className="relative">
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-ops-100" />
        <div className="space-y-4">
          {activity.map((evt) => (
            <RouterLink
              key={evt.id}
              to={`/staff/requests/${evt.requestId}`}
              className="relative flex gap-4 group"
            >
              <div className="relative z-10 flex-shrink-0">
                <ActivityIcon eventType={evt.eventType} />
              </div>
              <div className="flex-1 min-w-0 rounded-lg border border-transparent px-3 py-2 group-hover:border-ops-200 group-hover:bg-ops-50 transition-colors">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ops-800 truncate">
                    <span className="text-ops-500 font-normal">{evt.actorName}</span>
                    {' '}
                    {evt.description || eventLabel(evt.eventType)}
                  </p>
                  <span className="flex-shrink-0 text-xs tabular-nums text-ops-400">{timeAgo(evt.timestamp)}</span>
                </div>
                <p className="mt-0.5 text-xs text-ops-400 truncate">
                  {evt.requestTitle}
                </p>
              </div>
            </RouterLink>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ActivityIcon({ eventType }: { eventType: string }) {
  const base = 'flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white';
  switch (eventType) {
    case 'created': return <div className={`${base} border-sea-200 text-sea-500`}><Circle className="h-3 w-3 fill-current" /></div>;
    case 'routed': return <div className={`${base} border-ops-200 text-ops-400`}><ArrowRight className="h-4 w-4" /></div>;
    case 'assigned': return <div className={`${base} border-blue-200 text-blue-500`}><User className="h-4 w-4" /></div>;
    case 'started': return <div className={`${base} border-indigo-200 text-indigo-500`}><Clock className="h-4 w-4" /></div>;
    case 'completed': return <div className={`${base} border-emerald-200 text-emerald-500`}><CheckCircle2 className="h-4 w-4" /></div>;
    case 'escalated': return <div className={`${base} border-red-200 text-red-500`}><AlertTriangle className="h-4 w-4" /></div>;
    case 'cancelled': return <div className={`${base} border-ops-200 text-ops-400`}><X className="h-4 w-4" /></div>;
    default: return <div className={`${base} border-ops-100 text-ops-300`}><Bot className="h-4 w-4" /></div>;
  }
}

function eventLabel(eventType: string): string {
  const map: Record<string, string> = {
    created: 'submitted a request',
    routed: 'routed request to department',
    assigned: 'assigned the request',
    started: 'started working on request',
    completed: 'completed the request',
    escalated: 'escalated the request',
    cancelled: 'cancelled the request',
    note: 'added a note',
  };
  return map[eventType] ?? eventType;
}

// ============================================================
// Shared UI helpers
// ============================================================

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ops-200 bg-white p-5">
      <div className="mb-4 flex items-start gap-2">
        {icon && <span className="mt-0.5 flex-shrink-0">{icon}</span>}
        <div>
          <h2 className="text-sm font-semibold text-ops-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ops-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyState({
  message,
  icon,
}: {
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      {icon ?? <Inbox className="h-8 w-8 text-ops-200" />}
      <p className="text-sm text-ops-400">{message}</p>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-lg border py-1.5 pl-3 pr-7 text-xs font-medium focus:outline-none transition-colors ${
          value !== 'All'
            ? 'border-ops-600 bg-ops-900 text-white'
            : 'border-ops-200 bg-white text-ops-600 hover:border-ops-300'
        }`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === 'All' ? `${label}: All` : o}
          </option>
        ))}
      </select>
      <ChevronDown className={`pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 ${value !== 'All' ? 'text-white' : 'text-ops-400'}`} />
    </div>
  );
}
