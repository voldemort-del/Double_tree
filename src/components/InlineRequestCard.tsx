import type { HotelRequest } from '@/types';
import { StatusBadge, PriorityBadge, DepartmentBadge } from './Badges';
import { Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatTime, isOverdue, minutesUntil } from '@/utils/format';

export function InlineRequestCard({ request }: { request: HotelRequest }) {
  const overdue = isOverdue(request);
  const remaining = minutesUntil(request.slaDeadline);

  return (
    <div className="mt-3 rounded-xl border border-sea-200 bg-sea-50/60 p-4 transition-all hover:bg-sea-50 hover:shadow-sm animate-slide-in-right">
      <div className="flex items-center gap-1.5 text-xs font-medium text-sea-700">
        <span className="h-1.5 w-1.5 rounded-full bg-sea-500 animate-pulse-soft" />
        Service Request Created
      </div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{request.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{request.shortId} · Room {request.roomNumber}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <DepartmentBadge department={request.department} />
        <PriorityBadge priority={request.priority} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-sea-200/60 pt-2.5">
        <div className="flex items-center gap-2.5 text-xs text-slate-500">
          <span>{formatTime(request.createdAt)}</span>
          <span>·</span>
          {overdue ? (
            <span className="flex items-center gap-1 font-medium text-red-600">
              <AlertTriangle className="h-3 w-3" /> Overdue
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> SLA {remaining}m
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-sea-700">
          View Request <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
