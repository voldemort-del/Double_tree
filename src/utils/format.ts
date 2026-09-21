import type {
  Department,
  RequestCategory,
  RequestPriority,
  RequestStatus,
} from '@/types';

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function minutesUntil(iso: string): number {
  const now = new Date();
  const then = new Date(iso);
  return Math.round((then.getTime() - now.getTime()) / 60000);
}

export function isOverdue(request: {
  status: RequestStatus;
  slaDeadline: string;
}): boolean {
  if (request.status === 'Completed' || request.status === 'Cancelled') return false;
  return new Date(request.slaDeadline).getTime() < Date.now();
}

export type SlaCondition = 'on_track' | 'approaching' | 'overdue' | 'completed' | 'cancelled';

export interface SlaInfo {
  condition: SlaCondition;
  formattedText: string;
  isOverdue: boolean;
  minutesRemaining: number;
}

export function getSlaInfo(request: {
  status: RequestStatus;
  slaDeadline: string;
  completedAt?: string;
  createdAt?: string;
}): SlaInfo {
  if (request.status === 'Completed') {
    if (request.completedAt) {
      const completedTime = new Date(request.completedAt).getTime();
      const deadline = new Date(request.slaDeadline).getTime();
      const diffMins = Math.round((deadline - completedTime) / 60000);
      if (diffMins >= 0) {
        return {
          condition: 'completed',
          formattedText: `Completed on time (${formatTime(request.completedAt)})`,
          isOverdue: false,
          minutesRemaining: 0,
        };
      } else {
        return {
          condition: 'completed',
          formattedText: `Completed ${Math.abs(diffMins)}m late (${formatTime(request.completedAt)})`,
          isOverdue: true,
          minutesRemaining: 0,
        };
      }
    }
    return {
      condition: 'completed',
      formattedText: 'Completed',
      isOverdue: false,
      minutesRemaining: 0,
    };
  }

  if (request.status === 'Cancelled') {
    return {
      condition: 'cancelled',
      formattedText: 'Cancelled',
      isOverdue: false,
      minutesRemaining: 0,
    };
  }

  const mins = minutesUntil(request.slaDeadline);

  if (mins < 0) {
    const overdueMins = Math.abs(mins);
    const overdueText =
      overdueMins >= 60
        ? `${Math.floor(overdueMins / 60)}h ${overdueMins % 60}m`
        : `${overdueMins} min`;
    return {
      condition: 'overdue',
      formattedText: `Overdue by ${overdueText}`,
      isOverdue: true,
      minutesRemaining: mins,
    };
  }

  if (mins <= 15) {
    return {
      condition: 'approaching',
      formattedText: `Due in ${mins} min`,
      isOverdue: false,
      minutesRemaining: mins,
    };
  }

  if (mins < 60) {
    return {
      condition: 'on_track',
      formattedText: `Due in ${mins} min`,
      isOverdue: false,
      minutesRemaining: mins,
    };
  }

  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return {
    condition: 'on_track',
    formattedText: `Due in ${hours}h ${remainingMins > 0 ? `${remainingMins}m` : ''}`.trim(),
    isOverdue: false,
    minutesRemaining: mins,
  };
}

// ---- Status styling ----

export function statusColor(status: RequestStatus): string {
  switch (status) {
    case 'Submitted':
      return 'text-amber-700 bg-amber-100 border-amber-200';
    case 'Assigned':
      return 'text-blue-700 bg-blue-100 border-blue-200';
    case 'In Progress':
      return 'text-indigo-700 bg-indigo-100 border-indigo-200';
    case 'Completed':
      return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    case 'Cancelled':
      return 'text-slate-500 bg-slate-100 border-slate-200';
    case 'Escalated':
      return 'text-red-700 bg-red-100 border-red-200';
    case 'Overdue':
      return 'text-red-800 bg-red-200 border-red-300';
  }
}

export function priorityColor(priority: RequestPriority): string {
  switch (priority) {
    case 'Low':
      return 'text-slate-600 bg-slate-100 border-slate-200';
    case 'Normal':
      return 'text-sea-700 bg-sea-100 border-sea-200';
    case 'High':
      return 'text-orange-700 bg-orange-100 border-orange-200';
    case 'Urgent':
      return 'text-red-700 bg-red-100 border-red-200';
  }
}

export function departmentColor(dept: Department): string {
  switch (dept) {
    case 'Front Desk':
      return 'text-sea-700 bg-sea-50 border-sea-200';
    case 'Housekeeping':
      return 'text-sand-700 bg-sand-50 border-sand-200';
    case 'Maintenance':
      return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'Food & Beverage':
      return 'text-rose-700 bg-rose-50 border-rose-200';
    case 'Concierge':
      return 'text-purple-700 bg-purple-50 border-purple-200';
    case 'Spa & Wellness':
      return 'text-teal-700 bg-teal-50 border-teal-200';
  }
}

export function categoryToDepartment(category: RequestCategory): Department {
  switch (category) {
    case 'Housekeeping':
      return 'Housekeeping';
    case 'Maintenance':
      return 'Maintenance';
    case 'Room Service':
      return 'Food & Beverage';
    case 'Spa & Wellness':
      return 'Spa & Wellness';
    case 'Transportation':
    case 'Concierge':
      return 'Concierge';
    case 'Information':
    case 'Other':
      return 'Front Desk';
  }
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
