import type { RequestStatus, RequestPriority, Department } from '@/types';
import { statusColor, priorityColor, departmentColor } from '@/utils/format';

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor(status)}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityColor(priority)}`}>
      {priority}
    </span>
  );
}

export function DepartmentBadge({ department, muted }: { department: Department; muted?: boolean }) {
  if (muted) {
    return <span className="text-xs font-medium text-slate-500">{department}</span>;
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${departmentColor(department)}`}>
      {department}
    </span>
  );
}
