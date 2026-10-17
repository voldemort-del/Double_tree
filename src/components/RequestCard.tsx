import type { HotelRequest } from '@/types';
import { StatusBadge, PriorityBadge, DepartmentBadge } from './Badges';
import { minutesUntil, isOverdue, timeAgo } from '@/utils/format';
import { RouterLink } from '@/utils/router';
import { Clock, AlertTriangle } from 'lucide-react';

export function RequestCard({
  request,
  to,
  showGuest,
  guestName,
  showStaff,
  staffName,
}: {
  request: HotelRequest;
  to: string;
  showGuest?: boolean;
  guestName?: string;
  showStaff?: boolean;
  staffName?: string;
}) {
  const overdue = isOverdue(request);
  const remaining = minutesUntil(request.slaDeadline);

  return (
    <RouterLink
      to={to}
      className="group block rounded-xl border border-stone-800/90 bg-[#1a1916] hover:bg-[#23211c] hover:border-amber-500/40 p-4 transition-all hover:shadow-lg animate-slide-up"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
            <span className="font-mono font-medium text-amber-400/90">{request.shortId}</span>
            <span className="text-stone-600">·</span>
            <span className="font-medium text-stone-300">Room {request.roomNumber}</span>
            {showGuest && guestName && (
              <>
                <span className="text-stone-600">·</span>
                <span className="text-stone-300">{guestName}</span>
              </>
            )}
            <span className="text-stone-600">·</span>
            <span className="text-stone-400">{timeAgo(request.createdAt)}</span>
          </div>
          <h4 className="mt-1.5 truncate text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">
            {request.title}
          </h4>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DepartmentBadge department={request.department} />
        <PriorityBadge priority={request.priority} />
        {showStaff && staffName && (
          <span className="text-xs text-stone-400">
            Assigned to <span className="font-medium text-stone-200">{staffName}</span>
          </span>
        )}
      </div>

      {request.status !== 'Completed' && request.status !== 'Cancelled' && (
        <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-stone-800/80">
          {overdue ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              Overdue by {Math.abs(remaining)}m
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 ${remaining < 15 ? 'text-amber-400 font-medium' : 'text-stone-400'}`}>
              <Clock className="h-3.5 w-3.5" />
              SLA: {remaining}m remaining
            </span>
          )}
        </div>
      )}
    </RouterLink>
  );
}
