import type { HotelRequest } from '@/types';
import { StatusBadge, PriorityBadge, DepartmentBadge } from './Badges';
import { Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatTime, isOverdue, minutesUntil } from '@/utils/format';

export function InlineRequestCard({ request }: { request: HotelRequest }) {
  const overdue = isOverdue(request);
  const remaining = minutesUntil(request.slaDeadline);

  return (
    <div className="mt-3 rounded-xl border border-stone-800 bg-[#1a1916] p-4 transition-all hover:border-amber-500/40 hover:shadow-md animate-slide-in-right">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse-soft" />
        Service Request Created
      </div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{request.title}</p>
          <p className="mt-0.5 text-xs text-stone-400 font-mono">{request.shortId} · Room {request.roomNumber}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <DepartmentBadge department={request.department} />
        <PriorityBadge priority={request.priority} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-stone-800/80 pt-2.5">
        <div className="flex items-center gap-2.5 text-xs text-stone-400">
          <span>{formatTime(request.createdAt)}</span>
          <span>·</span>
          {overdue ? (
            <span className="flex items-center gap-1 font-semibold text-rose-400">
              <AlertTriangle className="h-3 w-3" /> Overdue
            </span>
          ) : (
            <span className="flex items-center gap-1 font-medium text-stone-400">
              <Clock className="h-3 w-3" /> SLA {remaining}m
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
          View Request <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
