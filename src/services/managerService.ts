import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { HotelRequest, RequestEvent } from '@/types';
import { getStoredMockEvents, getStoredMockRequests } from '@/services/requestService';

// ============================================================
// Manager service — hotel-wide data access for the manager
// Operations Command Centre. All queries are scoped to the
// manager's hotel_id and respect existing RLS policies.
// ============================================================

// ---- Activity feed ----

export interface ActivityItem {
  id: string;
  requestId: string;
  requestTitle: string;
  eventType: RequestEvent['eventType'];
  actor: RequestEvent['actor'];
  actorName: string;
  timestamp: string;
  description: string;
}

function getDynamicMockActivity(): ActivityItem[] {
  const evts = getStoredMockEvents();
  const reqs = getStoredMockRequests();
  const reqMap = new Map(reqs.map((r) => [r.id, r.title]));

  return [...evts].reverse().map((e) => ({
    id: e.id,
    requestId: e.requestId,
    requestTitle: reqMap.get(e.requestId) ?? 'Request',
    eventType: e.eventType,
    actor: e.actor,
    actorName: e.actorName,
    timestamp: e.timestamp,
    description: e.description,
  }));
}

export async function getRecentActivity(
  hotelId: string,
  limit = 60,
): Promise<ActivityItem[]> {
  if (!isSupabaseConfigured) return getDynamicMockActivity();

  try {
    // Fetch recent events for this hotel's requests
    // We join through requests to get the hotel scoping
    const { data, error } = await supabase
      .from('request_events')
      .select(`
        id, request_id, actor_type, actor_id, event_type, message, created_at,
        requests!inner(hotel_id, title)
      `)
      .eq('requests.hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return DEMO_ACTIVITY;

    // Also fetch staff names for staff actor events
    const staffIds = (data as any[])
      .filter((e) => e.actor_type === 'staff' && e.actor_id)
      .map((e) => e.actor_id as string);

    let staffMap: Record<string, string> = {};
    if (staffIds.length > 0) {
      const { data: staffList } = await supabase
        .from('staff_profiles')
        .select('id, first_name, last_name')
        .in('id', [...new Set(staffIds)]);
      if (staffList) {
        staffMap = staffList.reduce((acc, s) => {
          acc[s.id] = `${s.first_name} ${s.last_name}`;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    return (data as any[]).map((e) => {
      let actorName = 'System';
      if (e.actor_type === 'assistant') actorName = 'Concierge AI';
      else if (e.actor_type === 'guest') actorName = 'Guest';
      else if (e.actor_type === 'staff') {
        actorName = e.actor_id ? (staffMap[e.actor_id] ?? 'Staff') : 'Staff';
      }

      return {
        id: e.id,
        requestId: e.request_id,
        requestTitle: (e.requests as any)?.title ?? 'Request',
        eventType: e.event_type as RequestEvent['eventType'],
        actor: e.actor_type as RequestEvent['actor'],
        actorName,
        timestamp: e.created_at,
        description: e.message ?? '',
      };
    });
  } catch (err) {
    console.warn('getRecentActivity error:', err);
    return DEMO_ACTIVITY;
  }
}

// ---- Computed metrics (derived from request list — no extra queries) ----

export interface DepartmentMetric {
  department: string;
  total: number;
  active: number;
  submitted: number;
  inProgress: number;
  completed: number;
  completedToday: number;
  overdue: number;
  escalated: number;
  avgCompletionMinutes: number | null;
}

export function computeDepartmentMetrics(requests: HotelRequest[]): DepartmentMetric[] {
  const today = new Date().toDateString();

  const depts = [
    'Front Desk',
    'Housekeeping',
    'Maintenance',
    'Food & Beverage',
    'Concierge',
    'Spa & Wellness',
  ];

  return depts.map((dept) => {
    const reqs = requests.filter((r) => r.department === dept);
    const completedReqs = reqs.filter((r) => r.status === 'Completed');

    // Average completion time (minutes) — only for completed requests with timestamps
    const withDuration = completedReqs.filter(
      (r) => r.completedAt && r.createdAt,
    );
    const avgCompletionMinutes =
      withDuration.length > 0
        ? Math.round(
            withDuration.reduce((sum, r) => {
              const ms =
                new Date(r.completedAt!).getTime() -
                new Date(r.createdAt).getTime();
              return sum + ms / 60000;
            }, 0) / withDuration.length,
          )
        : null;

    const isOverdueReq = (r: HotelRequest) => {
      if (r.status === 'Completed' || r.status === 'Cancelled') return false;
      return new Date(r.slaDeadline).getTime() < Date.now();
    };

    return {
      department: dept,
      total: reqs.length,
      active: reqs.filter(
        (r) => r.status !== 'Completed' && r.status !== 'Cancelled',
      ).length,
      submitted: reqs.filter((r) => r.status === 'Submitted').length,
      inProgress: reqs.filter((r) => r.status === 'In Progress').length,
      completed: completedReqs.length,
      completedToday: reqs.filter(
        (r) =>
          r.status === 'Completed' &&
          r.completedAt &&
          new Date(r.completedAt).toDateString() === today,
      ).length,
      overdue: reqs.filter((r) => isOverdueReq(r)).length,
      escalated: reqs.filter((r) => r.status === 'Escalated').length,
      avgCompletionMinutes,
    };
  });
}

export interface StaffWorkloadItem {
  staffId: string;
  name: string;
  department: string;
  active: number;
  inProgress: number;
  overdue: number;
  completedToday: number;
  total: number;
}

export function computeStaffWorkload(
  requests: HotelRequest[],
  staffList: { id: string; first_name: string; last_name: string; departmentName?: string; role: string }[],
): StaffWorkloadItem[] {
  const today = new Date().toDateString();

  const isOverdueReq = (r: HotelRequest) => {
    if (r.status === 'Completed' || r.status === 'Cancelled') return false;
    return new Date(r.slaDeadline).getTime() < Date.now();
  };

  return staffList
    .filter((s) => s.role === 'staff')
    .map((s) => {
      const fullName = `${s.first_name} ${s.last_name}`;
      // Match by ID (Supabase) or name (demo fallback)
      const staffReqs = requests.filter(
        (r) =>
          r.assignedTo === s.id ||
          (!r.assignedTo &&
            r.assignedStaffName?.toLowerCase() === fullName.toLowerCase()),
      );

      return {
        staffId: s.id,
        name: fullName,
        department: s.departmentName ?? 'Unknown',
        active: staffReqs.filter(
          (r) => r.status !== 'Completed' && r.status !== 'Cancelled',
        ).length,
        inProgress: staffReqs.filter((r) => r.status === 'In Progress').length,
        overdue: staffReqs.filter((r) => isOverdueReq(r)).length,
        completedToday: staffReqs.filter(
          (r) =>
            r.status === 'Completed' &&
            r.completedAt &&
            new Date(r.completedAt).toDateString() === today,
        ).length,
        total: staffReqs.length,
      };
    })
    .sort((a, b) => b.active - a.active);
}

export interface SlaMetrics {
  onTrack: number;
  approaching: number;
  overdue: number;
  completedOnTime: number;
  completedLate: number;
  complianceRate: number; // 0–100
}

export function computeSlaMetrics(requests: HotelRequest[]): SlaMetrics {
  const active = requests.filter(
    (r) => r.status !== 'Completed' && r.status !== 'Cancelled',
  );
  const completed = requests.filter((r) => r.status === 'Completed');

  const now = Date.now();

  let onTrack = 0;
  let approaching = 0;
  let overdue = 0;

  for (const r of active) {
    const minsRemaining =
      (new Date(r.slaDeadline).getTime() - now) / 60000;
    if (minsRemaining < 0) overdue++;
    else if (minsRemaining <= 15) approaching++;
    else onTrack++;
  }

  let completedOnTime = 0;
  let completedLate = 0;

  for (const r of completed) {
    if (!r.completedAt) { completedOnTime++; continue; }
    const finishedBeforeDeadline =
      new Date(r.completedAt).getTime() <=
      new Date(r.slaDeadline).getTime();
    if (finishedBeforeDeadline) completedOnTime++;
    else completedLate++;
  }

  const total = requests.filter(r => r.status !== 'Cancelled').length;
  const compliant = completedOnTime + onTrack;
  const complianceRate =
    total > 0 ? Math.round((compliant / total) * 100) : 100;

  return {
    onTrack,
    approaching,
    overdue,
    completedOnTime,
    completedLate,
    complianceRate,
  };
}

// ---- Trend helper: group requests by day ----

export interface DayBucket {
  date: string; // "Mon 15", etc.
  count: number;
}

export function computeDailyTrend(
  requests: HotelRequest[],
  days: number,
): DayBucket[] {
  const buckets: Record<string, number> = {};
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
    });
    buckets[key] = 0;
  }

  for (const r of requests) {
    const d = new Date(r.createdAt);
    const key = d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
    });
    if (key in buckets) {
      buckets[key]++;
    }
  }

  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

// ---- Demo fallback data ----

const DEMO_ACTIVITY: ActivityItem[] = [
  {
    id: 'act-1',
    requestId: 'req-demo',
    requestTitle: 'Extra towels',
    eventType: 'created',
    actor: 'guest',
    actorName: 'Guest',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    description: 'Request submitted',
  },
  {
    id: 'act-2',
    requestId: 'req-demo',
    requestTitle: 'Extra towels',
    eventType: 'routed',
    actor: 'assistant',
    actorName: 'Concierge AI',
    timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
    description: 'Sent to Housekeeping',
  },
];
