import type { HotelRequest } from '@/types';
import { StatusBadge, PriorityBadge, DepartmentBadge } from './Badges';
import { formatTime, formatDateTime, minutesUntil, isOverdue } from '@/utils/format';
import { Clock, AlertTriangle, MapPin, User } from 'lucide-react';

export function RequestDetailCard({
  request,
  guestName,
  staffName,
  children,
}: {
  request: HotelRequest;
  guestName?: string;
  staffName?: string;
  children?: React.ReactNode;
}) {
  const overdue = isOverdue(request);
  const remaining = minutesUntil(request.slaDeadline);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono font-medium text-slate-500">{request.shortId}</span>
            <span>·</span>
            <span>Created {formatDateTime(request.createdAt)}</span>
          </div>
          <h2 className="mt-1.5 text-xl font-semibold text-slate-900">{request.title}</h2>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {request.description && (
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{request.description}</p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Room" value={`Room ${request.roomNumber}`} icon={<MapPin className="h-3.5 w-3.5" />} />
        {guestName && <Field label="Guest" value={guestName} icon={<User className="h-3.5 w-3.5" />} />}
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Department</p>
          <DepartmentBadge department={request.department} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Priority</p>
          <PriorityBadge priority={request.priority} />
        </div>
        {staffName && (
          <Field label="Assigned to" value={staffName} icon={<User className="h-3.5 w-3.5" />} />
        )}
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">SLA Target</p>
            <p className="mt-0.5 text-sm font-medium text-slate-700">{request.slaTargetMinutes} minutes</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Deadline</p>
            <p className="mt-0.5 text-sm font-medium text-slate-700">{formatTime(request.slaDeadline)}</p>
          </div>
          {request.status !== 'Completed' && request.status !== 'Cancelled' && (
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Remaining</p>
              {overdue ? (
                <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-red-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {Math.abs(remaining)}m overdue
                </p>
              ) : (
                <p className={`mt-0.5 flex items-center gap-1 text-sm font-semibold ${remaining < 10 ? 'text-orange-600' : 'text-slate-700'}`}>
                  <Clock className="h-3.5 w-3.5" />
                  {remaining}m
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
        {icon && <span className="text-slate-400">{icon}</span>}
        {value}
      </p>
    </div>
  );
}
