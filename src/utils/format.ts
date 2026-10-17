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
      return 'badge-tone-warning';
    case 'Assigned':
      return 'badge-tone-info';
    case 'In Progress':
      return 'badge-tone-violet';
    case 'Completed':
      return 'badge-tone-success';
    case 'Cancelled':
      return 'badge-tone-muted';
    case 'Escalated':
      return 'badge-tone-danger';
    case 'Overdue':
      return 'badge-tone-danger';
  }
}

export function priorityColor(priority: RequestPriority): string {
  switch (priority) {
    case 'Low':
      return 'badge-tone-muted';
    case 'Normal':
      return 'badge-tone-warning';
    case 'High':
      return 'badge-tone-warning';
    case 'Urgent':
      return 'badge-tone-danger';
  }
}

export function departmentColor(dept: Department): string {
  switch (dept) {
    case 'Front Desk':
      return 'badge-tone-warning';
    case 'Housekeeping':
      return 'badge-tone-success';
    case 'Maintenance':
      return 'badge-tone-warning';
    case 'Food & Beverage':
      return 'badge-tone-danger';
    case 'Concierge':
      return 'badge-tone-violet';
    case 'Spa & Wellness':
      return 'badge-tone-info';
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
