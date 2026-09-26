import { useState, useMemo } from 'react';
import { useStaffRequests, useStaffList } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import type { Department, RequestPriority, RequestStatus } from '@/types';
import { StatusBadge, PriorityBadge, DepartmentBadge } from '@/components/Badges';
import { isOverdue, formatTime, timeAgo, getSlaInfo } from '@/utils/format';
import { RouterLink } from '@/utils/router';
import {
  Search,
  ChevronDown,
  AlertTriangle,
  Clock,
  Loader2,
  CheckCircle2,
  User,
  SlidersHorizontal,
  X,
} from 'lucide-react';

const DEPARTMENTS: ('All' | Department)[] = [
  'All',
  'Front Desk',
  'Housekeeping',
  'Maintenance',
  'Food & Beverage',
  'Concierge',
  'Spa & Wellness',
];

const STATUSES: ('All' | RequestStatus)[] = [
  'All',
  'Submitted',
  'Assigned',
  'In Progress',
  'Completed',
  'Escalated',
  'Cancelled',
];

const PRIORITIES: ('All' | RequestPriority)[] = ['All', 'Urgent', 'High', 'Normal', 'Low'];

const SLA_CONDITIONS = ['All', 'Overdue', 'Approaching', 'On Track', 'Completed'] as const;
type SlaFilterOption = (typeof SLA_CONDITIONS)[number];

const ASSIGNED_OPTIONS = ['All', 'Assigned to Me', 'Unassigned'] as const;
type AssignedFilterOption = (typeof ASSIGNED_OPTIONS)[number];

const SORTS = ['Newest', 'Oldest', 'SLA Deadline', 'Highest Priority'] as const;
type SortOption = (typeof SORTS)[number];

const priorityWeight: Record<RequestPriority, number> = {
  Urgent: 4,
  High: 3,
  Normal: 2,
  Low: 1,
};

export function StaffRequests() {
  const { staffData } = useAuth();
  const hotelId = staffData?.hotelId ?? 'a0000000-0000-0000-0000-000000000001';
  const { requests: allRequests, loading, error } = useStaffRequests(hotelId);
  const staffList = useStaffList(hotelId);

  const [search, setSearch] = useState('');
  const [dept, setDept] = useState<'All' | Department>('All');
  const [status, setStatus] = useState<'All' | RequestStatus>('All');
  const [priority, setPriority] = useState<'All' | RequestPriority>('All');
  const [assignedFilter, setAssignedFilter] = useState<AssignedFilterOption>('All');
  const [slaFilter, setSlaFilter] = useState<SlaFilterOption>('All');
  const [sort, setSort] = useState<SortOption>('Newest');

  const myDept = staffData?.department;

  const filtered = useMemo(() => {
    let result = allRequests.filter((r) => {
      // 1. Department filter
      if (dept !== 'All' && r.department !== dept) return false;

      // 2. Status filter
      if (status !== 'All' && r.status !== status) return false;

      // 3. Priority filter
      if (priority !== 'All' && r.priority !== priority) return false;

      // 4. Assigned staff filter
      if (assignedFilter === 'Assigned to Me') {
        const isAssignedToMe =
          (staffData?.staffId && r.assignedTo === staffData.staffId) ||
          (staffData?.name && r.assignedStaffName?.toLowerCase() === staffData.name.toLowerCase());
        if (!isAssignedToMe) return false;
      } else if (assignedFilter === 'Unassigned') {
        if (r.assignedTo || r.assignedStaffName) return false;
      }

      // 5. SLA condition filter
      if (slaFilter !== 'All') {
        const sla = getSlaInfo(r);
        if (slaFilter === 'Overdue' && !sla.isOverdue) return false;
        if (slaFilter === 'Approaching' && sla.condition !== 'approaching') return false;
        if (slaFilter === 'On Track' && (sla.condition !== 'on_track' || sla.isOverdue)) return false;
        if (slaFilter === 'Completed' && sla.condition !== 'completed') return false;
      }

      // 6. Search (guest name, room, title, shortId, id)
      if (search) {
        const q = search.trim().toLowerCase();
        const matches =
          r.title.toLowerCase().includes(q) ||
          r.shortId.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.roomNumber.toLowerCase().includes(q) ||
          (r.guestName?.toLowerCase().includes(q) ?? false) ||
          r.department.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });

    // 7. Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'Newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'Oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'SLA Deadline':
          return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
        case 'Highest Priority':
          return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
    });

    return result;
  }, [allRequests, dept, status, priority, assignedFilter, slaFilter, search, sort, staffData]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-ops-600" />
        <p className="text-sm font-medium text-ops-500">Loading Request Queue…</p>
      </div>
    );
  }

  const hasActiveFilters =
    dept !== 'All' ||
    status !== 'All' ||
    priority !== 'All' ||
    assignedFilter !== 'All' ||
    slaFilter !== 'All' ||
    Boolean(search);

  function resetFilters() {
    setDept('All');
    setStatus('All');
    setPriority('All');
    setAssignedFilter('All');
    setSlaFilter('All');
    setSearch('');
  }

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {/* Header with Quick Department Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ops-900">Operational Request Queue</h1>
          <p className="mt-1 text-sm text-ops-500">
            Showing <span className="font-semibold text-ops-800">{filtered.length}</span> of {allRequests.length} total hotel service requests
          </p>
        </div>

        {/* Quick Dept Toggles */}
        {myDept && (
          <div className="flex items-center gap-2 rounded-xl border border-ops-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setDept('All')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                dept === 'All'
                  ? 'bg-ops-900 text-white shadow-sm'
                  : 'text-ops-600 hover:text-ops-900'
              }`}
            >
              All Departments
            </button>
            <button
              onClick={() => setDept(myDept)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                dept === myDept
                  ? 'bg-ops-900 text-white shadow-sm'
                  : 'text-ops-600 hover:text-ops-900'
              }`}
            >
              My Dept ({myDept})
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-ops-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID (#1042), room (408), guest name, or title…"
              className="w-full rounded-xl border border-ops-200 bg-ops-50 py-2.5 pl-10 pr-4 text-sm text-ops-900 placeholder:text-ops-400 outline-none transition-colors focus:border-ops-600 focus:bg-white focus:ring-2 focus:ring-ops-100"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ops-400 hover:text-ops-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ops-500 whitespace-nowrap">Sort:</span>
            <Select
              label="Sort"
              value={sort}
              options={SORTS as unknown as string[]}
              onChange={(v) => setSort(v as SortOption)}
            />
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-ops-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ops-500 mr-1">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters:
          </div>

          <Select
            label="Dept"
            value={dept}
            options={DEPARTMENTS}
            onChange={(v) => setDept(v as Department | 'All')}
          />

          <Select
            label="Status"
            value={status}
            options={STATUSES}
            onChange={(v) => setStatus(v as RequestStatus | 'All')}
          />

          <Select
            label="Priority"
            value={priority}
            options={PRIORITIES}
            onChange={(v) => setPriority(v as RequestPriority | 'All')}
          />

          <Select
            label="Assignment"
            value={assignedFilter}
            options={ASSIGNED_OPTIONS as unknown as string[]}
            onChange={(v) => setAssignedFilter(v as AssignedFilterOption)}
          />

          <Select
            label="SLA"
            value={slaFilter}
            options={SLA_CONDITIONS as unknown as string[]}
            onChange={(v) => setSlaFilter(v as SlaFilterOption)}
          />

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800"
            >
              <X className="h-3.5 w-3.5" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Desktop Operational Table */}
      <div className="hidden overflow-hidden rounded-2xl border border-ops-200 bg-white shadow-sm lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ops-200 bg-ops-50/70 text-left text-xs font-bold uppercase tracking-wider text-ops-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Request Details</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned Staff</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">SLA Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ops-100">
            {filtered.map((req) => {
              const overdue = isOverdue(req);
              const sla = getSlaInfo(req);

              return (
                <RouterLink
                  key={req.id}
                  to={`/staff/requests/${req.id}`}
                  className="contents"
                >
                  <tr
                    className={`transition-colors cursor-pointer hover:bg-ops-50/80 ${
                      req.priority === 'Urgent'
                        ? 'bg-red-50/30'
                        : overdue
                        ? 'bg-amber-50/20'
                        : ''
                    }`}
                  >
                    {/* ID */}
                    <td className="px-4 py-3 font-mono text-xs font-bold text-ops-800 whitespace-nowrap">
                      {req.shortId}
                    </td>

                    {/* Room */}
                    <td className="px-4 py-3 font-semibold text-ops-900 whitespace-nowrap">
                      {req.roomNumber || '—'}
                    </td>

                    {/* Guest Name */}
                    <td className="px-4 py-3 text-ops-700 whitespace-nowrap">
                      {req.guestName ?? '—'}
                    </td>

                    {/* Request Details */}
                    <td className="px-4 py-3 max-w-[260px]">
                      <p className="truncate font-semibold text-ops-900">{req.title}</p>
                      {req.description && (
                        <p className="truncate text-xs text-ops-400 mt-0.5">{req.description}</p>
                      )}
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <DepartmentBadge department={req.department} muted />
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PriorityBadge priority={req.priority} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>

                    {/* Assigned Staff */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {req.assignedStaffName ? (
                        <span className="flex items-center gap-1.5 font-medium text-ops-800">
                          <User className="h-3 w-3 text-ops-400" />
                          {req.assignedStaffName}
                        </span>
                      ) : (
                        <span className="italic text-ops-400">Unassigned</span>
                      )}
                    </td>

                    {/* Created Time */}
                    <td className="px-4 py-3 text-xs text-ops-400 whitespace-nowrap">
                      {timeAgo(req.createdAt)}
                    </td>

                    {/* SLA Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          sla.isOverdue
                            ? 'bg-red-100 text-red-700 font-bold'
                            : sla.condition === 'approaching'
                            ? 'bg-amber-100 text-amber-800 font-semibold'
                            : sla.condition === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-ops-100 text-ops-700'
                        }`}
                      >
                        {sla.isOverdue ? (
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                        ) : (
                          <Clock className="h-3 w-3 text-ops-400" />
                        )}
                        {sla.formattedText}
                      </span>
                    </td>
                  </tr>
                </RouterLink>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-ops-300" />
            <p className="mt-2 text-sm font-semibold text-ops-700">No requests match your filters</p>
            <p className="mt-1 text-xs text-ops-400">Try adjusting your department, status, or search terms.</p>
            <button
              onClick={resetFilters}
              className="mt-3 inline-block rounded-lg bg-ops-100 px-3 py-1.5 text-xs font-semibold text-ops-700 hover:bg-ops-200"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Mobile Card List View */}
      <div className="space-y-3 lg:hidden">
        {filtered.map((req) => {
          const overdue = isOverdue(req);
          const sla = getSlaInfo(req);

          return (
            <RouterLink
              key={req.id}
              to={`/staff/requests/${req.id}`}
              className={`block rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                req.priority === 'Urgent'
                  ? 'border-red-300 bg-red-50/30'
                  : 'border-ops-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-ops-800">{req.shortId}</span>
                    <span className="text-xs font-semibold text-ops-600">Room {req.roomNumber}</span>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-ops-900">{req.title}</h3>
                  <p className="text-xs text-ops-400">
                    {req.guestName ?? 'Guest'} · {timeAgo(req.createdAt)}
                  </p>
                </div>
                <StatusBadge status={req.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ops-100 pt-3">
                <DepartmentBadge department={req.department} muted />
                <PriorityBadge priority={req.priority} />
                {req.assignedStaffName ? (
                  <span className="text-xs font-medium text-ops-700 flex items-center gap-1">
                    <User className="h-3 w-3 text-ops-400" />
                    {req.assignedStaffName}
                  </span>
                ) : (
                  <span className="text-xs italic text-ops-400">Unassigned</span>
                )}
                <span
                  className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    sla.isOverdue
                      ? 'bg-red-100 text-red-700'
                      : sla.condition === 'approaching'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-ops-100 text-ops-600'
                  }`}
                >
                  {sla.formattedText}
                </span>
              </div>
            </RouterLink>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ops-200 bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-ops-300" />
            <p className="mt-2 text-sm font-semibold text-ops-700">No requests found</p>
            <p className="mt-1 text-xs text-ops-400">Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-ops-200 bg-ops-50/80 py-2 pl-3 pr-8 text-xs font-semibold text-ops-700 outline-none transition-colors hover:border-ops-300 focus:border-ops-600 focus:bg-white cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === 'All' ? `${label}: All` : o}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ops-400 pointer-events-none" />
    </div>
  );
}
