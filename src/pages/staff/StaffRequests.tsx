import { useState, useMemo } from 'react';
import { useStaffRequests } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import type { Department, RequestPriority, RequestStatus } from '@/types';
import { StatusBadge, PriorityBadge, DepartmentBadge } from '@/components/Badges';
import { isOverdue, minutesUntil, timeAgo } from '@/utils/format';
import { RouterLink } from '@/utils/router';
import { Search, ChevronDown, AlertTriangle, Clock, Loader2 } from 'lucide-react';

const DEPARTMENTS: ('All' | Department)[] = ['All', 'Front Desk', 'Housekeeping', 'Maintenance', 'Food & Beverage', 'Concierge', 'Spa & Wellness'];
const STATUSES: ('All' | RequestStatus)[] = ['All', 'Submitted', 'Assigned', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];
const PRIORITIES: ('All' | RequestPriority)[] = ['All', 'Urgent', 'High', 'Normal', 'Low'];
const SORTS = ['Newest', 'Oldest', 'SLA Deadline', 'Priority'] as const;
type SortOption = (typeof SORTS)[number];

const priorityWeight: Record<RequestPriority, number> = { Urgent: 4, High: 3, Normal: 2, Low: 1 };

export function StaffRequests() {
  const { staffData } = useAuth();
  const { requests: allRequests, loading } = useStaffRequests(staffData?.hotelId ?? '');
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState<'All' | Department>('All');
  const [status, setStatus] = useState<'All' | RequestStatus>('All');
  const [priority, setPriority] = useState<'All' | RequestPriority>('All');
  const [sort, setSort] = useState<SortOption>('Newest');

  const filtered = useMemo(() => {
    let result = allRequests.filter((r) => {
      if (dept !== 'All' && r.department !== dept) return false;
      if (status !== 'All' && r.status !== status) return false;
      if (priority !== 'All' && r.priority !== priority) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          r.title.toLowerCase().includes(q) ||
          r.shortId.toLowerCase().includes(q) ||
          r.roomNumber.includes(q) ||
          (r.guestName?.toLowerCase().includes(q) ?? false);
        if (!matches) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'Newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'Oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'SLA Deadline':
          return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
        case 'Priority':
          return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
    });

    return result;
  }, [allRequests, dept, status, priority, search, sort]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-ops-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-ops-900">All Requests</h1>
        <p className="text-sm text-ops-400">{filtered.length} of {allRequests.length} requests</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ops-200 bg-white p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, room, guest, or title…"
            className="w-full rounded-lg border border-ops-200 bg-ops-50 py-2 pl-10 pr-3 text-sm text-ops-900 outline-none focus:border-ops-500 focus:bg-white"
          />
        </div>

        <Select label="Department" value={dept} options={DEPARTMENTS} onChange={(v) => setDept(v as Department | 'All')} />
        <Select label="Status" value={status} options={STATUSES} onChange={(v) => setStatus(v as RequestStatus | 'All')} />
        <Select label="Priority" value={priority} options={PRIORITIES} onChange={(v) => setPriority(v as RequestPriority | 'All')} />
        <Select label="Sort" value={sort} options={SORTS as unknown as string[]} onChange={(v) => setSort(v as SortOption)} />
      </div>

      {/* Table (desktop) */}
      <div className="hidden overflow-hidden rounded-xl border border-ops-200 bg-white lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ops-200 bg-ops-50 text-left text-xs font-medium uppercase tracking-wide text-ops-400">
              <th className="px-4 py-2.5">ID</th>
              <th className="px-4 py-2.5">Room</th>
              <th className="px-4 py-2.5">Guest</th>
              <th className="px-4 py-2.5">Request</th>
              <th className="px-4 py-2.5">Dept</th>
              <th className="px-4 py-2.5">Priority</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Assigned</th>
              <th className="px-4 py-2.5">SLA</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((req) => {
              const overdue = isOverdue(req);
              const remaining = minutesUntil(req.slaDeadline);
              return (
                <RouterLink key={req.id} to={`/staff/requests/${req.id}`} className="contents">
                  <tr className="border-b border-ops-100 transition-colors last:border-0 hover:bg-ops-50 cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-ops-700">{req.shortId}</td>
                    <td className="px-4 py-3 text-ops-700">{req.roomNumber}</td>
                    <td className="px-4 py-3 text-ops-600">{req.guestName ?? '—'}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-ops-800 font-medium">{req.title}</td>
                    <td className="px-4 py-3"><DepartmentBadge department={req.department} muted /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={req.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                    <td className="px-4 py-3 text-ops-600">{req.assignedStaffName ?? <span className="text-ops-300">Unassigned</span>}</td>
                    <td className="px-4 py-3">
                      {req.status === 'Completed' || req.status === 'Cancelled' ? (
                        <span className="text-ops-300">—</span>
                      ) : overdue ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600"><AlertTriangle className="h-3 w-3" />{Math.abs(remaining)}m</span>
                      ) : (
                        <span className={`flex items-center gap-1 text-xs ${remaining < 10 ? 'text-orange-600' : 'text-ops-500'}`}><Clock className="h-3 w-3" />{remaining}m</span>
                      )}
                    </td>
                  </tr>
                </RouterLink>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-ops-400">No requests match your filters.</div>
        )}
      </div>

      {/* Cards (mobile) */}
      <div className="space-y-3 lg:hidden">
        {filtered.map((req) => {
          const overdue = isOverdue(req);
          const remaining = minutesUntil(req.slaDeadline);
          return (
            <RouterLink key={req.id} to={`/staff/requests/${req.id}`} className="block rounded-xl border border-ops-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-medium text-ops-500">{req.shortId}</span>
                  <p className="mt-0.5 text-sm font-semibold text-ops-900">{req.title}</p>
                  <p className="text-xs text-ops-400">Room {req.roomNumber} · {req.guestName ?? '—'} · {timeAgo(req.createdAt)}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DepartmentBadge department={req.department} muted />
                <PriorityBadge priority={req.priority} />
                {req.assignedStaffName && <span className="text-xs text-ops-400">{req.assignedStaffName}</span>}
                {overdue && <span className="text-xs font-medium text-red-600">{Math.abs(remaining)}m overdue</span>}
              </div>
            </RouterLink>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-ops-200 bg-white p-8 text-center text-sm text-ops-400">No requests match your filters.</div>
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
        className="appearance-none rounded-lg border border-ops-200 bg-ops-50 py-2 pl-3 pr-8 text-sm font-medium text-ops-700 outline-none focus:border-ops-500"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o === 'All' ? `${label}: All` : o}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-400 pointer-events-none" />
    </div>
  );
}
