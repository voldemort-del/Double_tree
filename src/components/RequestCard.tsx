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
      className="block rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-sand-300 hover:shadow-md animate-slide-up"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono font-medium text-slate-500">{request.shortId}</span>
            <span>·</span>
            <span>Room {request.roomNumber}</span>
            {showGuest && guestName && (
              <>
                <span>·</span>
                <span>{guestName}</span>
              </>
            )}
            <span>·</span>
            <span>{timeAgo(request.createdAt)}</span>
          </div>
          <h4 className="mt-1 truncate text-sm font-semibold text-slate-800">{request.title}</h4>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DepartmentBadge department={request.department} />
        <PriorityBadge priority={request.priority} />
        {showStaff && staffName && (
          <span className="text-xs text-slate-400">
            Assigned to <span className="font-medium text-slate-600">{staffName}</span>
          </span>
        )}
      </div>

      {request.status !== 'Completed' && request.status !== 'Cancelled' && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {overdue ? (
            <span className="flex items-center gap-1 font-medium text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Overdue by {Math.abs(remaining)}m
            </span>
          ) : (
            <span className={`flex items-center gap-1 ${remaining < 10 ? 'text-orange-600' : 'text-slate-400'}`}>
              <Clock className="h-3.5 w-3.5" />
              SLA: {remaining}m remaining
            </span>
          )}
        </div>
      )}
    </RouterLink>
  );
}
