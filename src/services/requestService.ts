import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { RequestRow, RequestEventRow, SLARuleRow, DepartmentRow } from '@/types/database';
import type { HotelRequest, RequestEvent, RequestStatus, RequestPriority, Department } from '@/types';
import { initialRequests as mockRequests, initialEvents as mockRequestEvents } from '@/data/mockData';
import { emitRealtimeEvent } from '@/realtime/bus';

// ============================================================
// Request service — handles all request CRUD and lifecycle
// operations against Supabase. Converts between database rows
// and the UI-facing domain types.
// Supports cross-tab real-time sync for both Supabase and demo mode.
// ============================================================

const STORAGE_REQUESTS_KEY = 'dth_mock_requests';
const STORAGE_EVENTS_KEY = 'dth_mock_events';

export function getStoredMockRequests(): HotelRequest[] {
  if (typeof window === 'undefined') return mockRequests;
  try {
    const raw = localStorage.getItem(STORAGE_REQUESTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  saveStoredMockRequests(mockRequests);
  return mockRequests;
}

export function saveStoredMockRequests(reqs: HotelRequest[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(reqs));
  } catch {}
}

export function getStoredMockEvents(): RequestEvent[] {
  if (typeof window === 'undefined') return mockRequestEvents;
  try {
    const raw = localStorage.getItem(STORAGE_EVENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  saveStoredMockEvents(mockRequestEvents);
  return mockRequestEvents;
}

export function saveStoredMockEvents(evts: RequestEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(evts));
  } catch {}
}

// ---- Department mapping ----

const CATEGORY_TO_DEPT: Record<string, string> = {
  Housekeeping: 'Housekeeping',
  Maintenance: 'Maintenance',
  'Room Service': 'Food & Beverage',
  'Food & Beverage': 'Food & Beverage',
  'Spa & Wellness': 'Spa & Wellness',
  Spa: 'Spa & Wellness',
  Transportation: 'Concierge',
  Concierge: 'Concierge',
  Information: 'Front Desk',
  Emergency: 'Front Desk',
  'Front Desk': 'Front Desk',
  Other: 'Front Desk',
};

// ---- Row → Domain conversion ----

interface EnrichedRequest extends RequestRow {
  rooms?: { room_number: string } | { room_number: string }[];
  departments?: { name: string } | null;
  staff_profiles?: { first_name: string; last_name: string } | null;
  guests?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
}

function getRoomNumber(rooms: EnrichedRequest['rooms']): string {
  if (!rooms) return '';
  if (Array.isArray(rooms)) return rooms[0]?.room_number ?? '';
  return rooms.room_number ?? '';
}

function getGuestName(guests: EnrichedRequest['guests']): string | undefined {
  if (!guests) return undefined;
  if (Array.isArray(guests)) {
    const g = guests[0];
    return g ? `${g.first_name} ${g.last_name}` : undefined;
  }
  return `${guests.first_name} ${guests.last_name}`;
}

function getStaffName(staff: EnrichedRequest['staff_profiles']): string | undefined {
  if (!staff) return undefined;
  return `${staff.first_name} ${staff.last_name}`;
}

export function rowToRequest(row: EnrichedRequest): HotelRequest {
  return {
    id: row.id,
    shortId: `#${row.id.slice(-4).toUpperCase()}`,
    guestId: row.guest_id,
    roomId: row.room_id,
    roomNumber: getRoomNumber(row.rooms),
    conversationId: row.conversation_id ?? undefined,
    title: row.title,
    description: row.description,
    category: row.category as HotelRequest['category'],
    department: (row.departments?.name ?? 'Front Desk') as Department,
    priority: capitalizePriority(row.priority),
    status: dbStatusToUi(row.status),
    assignedTo: row.assigned_staff_id ?? undefined,
    guestName: getGuestName(row.guests),
    assignedStaffName: getStaffName(row.staff_profiles),
    createdAt: row.created_at,
    assignedAt: row.assigned_at ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    slaTargetMinutes: 60, // stored deadline is the source of truth; this is display-only
    slaDeadline: row.sla_due_at,
  };
}

function capitalizePriority(p: string): RequestPriority {
  const map: Record<string, RequestPriority> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };
  return map[p] ?? 'Normal';
}

function uiPriorityToDb(p: RequestPriority): string {
  const map: Record<RequestPriority, string> = {
    Low: 'low',
    Normal: 'normal',
    High: 'high',
    Urgent: 'urgent',
  };
  return map[p];
}

function dbStatusToUi(s: string): RequestStatus {
  const map: Record<string, RequestStatus> = {
    new: 'Submitted',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    escalated: 'Escalated',
  };
  return map[s] ?? 'Submitted';
}

export function uiStatusToDb(s: RequestStatus): string {
  const map: Record<RequestStatus, string> = {
    Submitted: 'new',
    Assigned: 'assigned',
    'In Progress': 'in_progress',
    Completed: 'completed',
    Cancelled: 'cancelled',
    Escalated: 'escalated',
    Overdue: 'escalated',
  };
  return map[s] ?? 'new';
}

// ---- Row → Domain for events ----

export function rowToEvent(row: RequestEventRow, staffName?: string): RequestEvent {
  return {
    id: row.id,
    requestId: row.request_id,
    eventType: row.event_type as RequestEvent['eventType'],
    actor: row.actor_type as RequestEvent['actor'],
    actorName: row.actor_type === 'staff' && staffName ? staffName : row.actor_type === 'assistant' ? 'Concierge AI' : row.actor_type === 'system' ? 'SLA Monitor' : 'Guest',
    timestamp: row.created_at,
    description: row.message ?? '',
  };
}

// ---- Queries ----

const REQUEST_SELECT = `
  id, hotel_id, guest_id, stay_id, room_id, conversation_id, department_id,
  assigned_staff_id, title, description, category, status, priority, source,
  sla_due_at, created_at, updated_at, completed_at, assigned_at, started_at,
  rooms!inner(room_number),
  departments(name),
  staff_profiles(first_name, last_name),
  guests(first_name, last_name)
`;

export async function getAllRequests(hotelId: string): Promise<HotelRequest[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(REQUEST_SELECT)
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return (data as unknown as EnrichedRequest[]).map(rowToRequest);
      }
    } catch (err) {
      console.warn('getAllRequests error, falling back to mock:', err);
    }
  }
  return getStoredMockRequests();
}

export async function getGuestRequests(guestId: string): Promise<HotelRequest[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(REQUEST_SELECT)
        .eq('guest_id', guestId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return (data as unknown as EnrichedRequest[]).map(rowToRequest);
      }
    } catch (err) {
      console.warn('getGuestRequests error, falling back to mock:', err);
    }
  }
  const all = getStoredMockRequests();
  return all.filter((r) => r.guestId === guestId || guestId === 'g-1' || r.guestId === 'b0000000-0000-0000-0000-000000000001');
}

export async function getRequestById(id: string): Promise<HotelRequest | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(REQUEST_SELECT)
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return rowToRequest(data as unknown as EnrichedRequest);
      }
    } catch (err) {
      console.warn('getRequestById error, falling back to mock:', err);
    }
  }
  const all = getStoredMockRequests();
  return all.find((r) => r.id === id) ?? null;
}

export async function getRequestEvents(requestId: string): Promise<RequestEvent[]> {
  if (isSupabaseConfigured) {
    try {
      const { data: events, error } = await supabase
        .from('request_events')
        .select('id, request_id, actor_type, actor_id, event_type, message, metadata, created_at')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (!error && events && events.length > 0) {
        const staffIds = events.filter((e) => e.actor_type === 'staff' && e.actor_id).map((e) => e.actor_id!);
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

        return events.map((e) => rowToEvent(e as RequestEventRow, e.actor_id ? staffMap[e.actor_id] : undefined));
      }
    } catch (err) {
      console.warn('getRequestEvents error, falling back to mock:', err);
    }
  }
  const all = getStoredMockEvents();
  return all.filter((e) => e.requestId === requestId);
}

// ---- SLA ----

export async function getSlaMinutes(hotelId: string, priority: RequestPriority): Promise<number> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('sla_rules')
        .select('id, hotel_id, department_id, priority, response_minutes, completion_minutes, created_at, updated_at')
        .eq('hotel_id', hotelId)
        .eq('priority', uiPriorityToDb(priority))
        .maybeSingle();

      if (!error && data) return (data as SLARuleRow).completion_minutes;
    } catch {}
  }
  return 60;
}

// ---- Department lookup ----

export async function getDepartmentByName(hotelId: string, name: string): Promise<DepartmentRow | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, hotel_id, name, description, created_at')
        .eq('hotel_id', hotelId)
        .eq('name', name)
        .maybeSingle();

      if (!error && data) return data as DepartmentRow;
    } catch {}
  }
  return null;
}

// ---- Create request ----

export interface CreateRequestInput {
  hotelId: string;
  guestId: string;
  stayId: string;
  roomId: string;
  conversationId?: string;
  title: string;
  description: string;
  category: string;
  priority: RequestPriority;
  source?: 'concierge' | 'staff' | 'system';
}

export async function createRequest(input: CreateRequestInput): Promise<HotelRequest | null> {
  const deptName = CATEGORY_TO_DEPT[input.category] ?? 'Front Desk';

  if (isSupabaseConfigured) {
    try {
      const department = await getDepartmentByName(input.hotelId, deptName);
      const slaMinutes = await getSlaMinutes(input.hotelId, input.priority);
      const slaDueAt = new Date(Date.now() + slaMinutes * 60000).toISOString();

      const { data: request, error } = await supabase
        .from('requests')
        .insert({
          hotel_id: input.hotelId,
          guest_id: input.guestId,
          stay_id: input.stayId,
          room_id: input.roomId,
          conversation_id: input.conversationId ?? null,
          department_id: department?.id ?? null,
          title: input.title,
          description: input.description,
          category: input.category,
          status: 'new',
          priority: uiPriorityToDb(input.priority),
          source: input.source ?? 'concierge',
          sla_due_at: slaDueAt,
        })
        .select(REQUEST_SELECT)
        .maybeSingle();

      if (error) {
        console.error('createRequest Supabase insert error:', error.message);
      } else if (request) {
        const req = rowToRequest(request as unknown as EnrichedRequest);

        await supabase.from('request_events').insert([
          {
            request_id: req.id,
            actor_type: 'guest',
            event_type: 'created',
            message: 'Request submitted',
          },
          {
            request_id: req.id,
            actor_type: 'assistant',
            event_type: 'routed',
            message: `Sent to ${deptName}`,
          },
        ]);

        emitRealtimeEvent({ type: 'request:created', request: req });
        return req;
      }
    } catch (err) {
      console.warn('createRequest error, falling back to in-memory:', err);
    }
  }

  // Demo fallback
  const allReqs = getStoredMockRequests();
  const shortNum = 1050 + allReqs.length;
  const newReq: HotelRequest = {
    id: `req-${shortNum}`,
    shortId: `#${shortNum}`,
    guestId: input.guestId,
    roomId: input.roomId,
    roomNumber: '408',
    guestName: 'Alex Morgan',
    conversationId: input.conversationId,
    title: input.title,
    description: input.description,
    category: input.category as any,
    department: (CATEGORY_TO_DEPT[input.category] ?? 'Front Desk') as any,
    priority: input.priority,
    status: 'Submitted',
    createdAt: new Date().toISOString(),
    slaTargetMinutes: 60,
    slaDeadline: new Date(Date.now() + 60 * 60000).toISOString(),
  };

  allReqs.unshift(newReq);
  saveStoredMockRequests(allReqs);

  const allEvts = getStoredMockEvents();
  allEvts.push(
    {
      id: `e-${shortNum}-1`,
      requestId: newReq.id,
      eventType: 'created',
      actor: 'guest',
      actorName: 'Alex Morgan',
      timestamp: new Date().toISOString(),
      description: 'Request submitted',
    },
    {
      id: `e-${shortNum}-2`,
      requestId: newReq.id,
      eventType: 'routed',
      actor: 'assistant',
      actorName: 'Concierge AI',
      timestamp: new Date().toISOString(),
      description: `Sent to ${newReq.department}`,
    },
  );
  saveStoredMockEvents(allEvts);

  emitRealtimeEvent({ type: 'request:created', request: newReq });

  return newReq;
}

// ---- Status transitions & Operational actions ----

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  staffId: string,
  staffName: string,
  note?: string,
): Promise<boolean> {
  const dbStatus = uiStatusToDb(status);
  const now = new Date().toISOString();
  const updates: Record<string, string> = { status: dbStatus, updated_at: now };

  if (status === 'Assigned') updates.assigned_at = now;
  if (status === 'In Progress') updates.started_at = now;
  if (status === 'Completed') updates.completed_at = now;

  let success = false;

  if (isSupabaseConfigured) {
    try {
      const { error: updateError } = await supabase
        .from('requests')
        .update(updates)
        .eq('id', requestId);

      if (!updateError) {
        success = true;

        const eventMessages: Record<RequestStatus, string> = {
          Submitted: note || 'Request submitted',
          Assigned: note || `${staffName} assigned to request`,
          'In Progress': note || `${staffName} started working on request`,
          Completed: note || `${staffName} completed request`,
          Cancelled: note || `Request cancelled by ${staffName}`,
          Escalated: note || `Request escalated by ${staffName}`,
          Overdue: 'SLA deadline passed — escalated',
        };

        const eventTypes: Record<RequestStatus, string> = {
          Submitted: 'created',
          Assigned: 'assigned',
          'In Progress': 'started',
          Completed: 'completed',
          Cancelled: 'cancelled',
          Escalated: 'escalated',
          Overdue: 'escalated',
        };

        await supabase.from('request_events').insert({
          request_id: requestId,
          actor_type: 'staff',
          actor_id: staffId,
          event_type: eventTypes[status],
          message: eventMessages[status],
        });
      }
    } catch (err) {
      console.warn('updateRequestStatus Supabase error, evaluating fallback:', err);
    }
  }

  // Also update stored mock for demo mode / offline
  const allReqs = getStoredMockRequests();
  const req = allReqs.find((r) => r.id === requestId);
  if (req) {
    req.status = status;
    if (status === 'Assigned') req.assignedAt = now;
    if (status === 'In Progress') req.startedAt = now;
    if (status === 'Completed') req.completedAt = now;

    saveStoredMockRequests(allReqs);

    const allEvts = getStoredMockEvents();
    allEvts.push({
      id: `evt-${Date.now()}`,
      requestId,
      eventType: status === 'In Progress' ? 'started' : status === 'Completed' ? 'completed' : status === 'Escalated' ? 'escalated' : status === 'Cancelled' ? 'cancelled' : 'assigned',
      actor: 'staff',
      actorName: staffName,
      timestamp: now,
      description: note || `${staffName} updated status to ${status}`,
    });
    saveStoredMockEvents(allEvts);
    success = true;

    emitRealtimeEvent({ type: 'request:updated', request: req });
  }

  return success;
}

export async function acceptRequest(
  requestId: string,
  staffId: string,
  staffName: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  let success = false;

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('requests')
        .update({
          assigned_staff_id: staffId,
          assigned_at: now,
          status: 'assigned',
          updated_at: now,
        })
        .eq('id', requestId);

      if (!error) {
        success = true;
        await supabase.from('request_events').insert({
          request_id: requestId,
          actor_type: 'staff',
          actor_id: staffId,
          event_type: 'assigned',
          message: `${staffName} accepted and assigned to request`,
        });
      }
    } catch (err) {
      console.warn('acceptRequest Supabase error:', err);
    }
  }

  const allReqs = getStoredMockRequests();
  const req = allReqs.find((r) => r.id === requestId);
  if (req) {
    req.status = 'Assigned';
    req.assignedTo = staffId;
    req.assignedStaffName = staffName;
    req.assignedAt = now;
    saveStoredMockRequests(allReqs);

    const allEvts = getStoredMockEvents();
    allEvts.push({
      id: `evt-${Date.now()}`,
      requestId,
      eventType: 'assigned',
      actor: 'staff',
      actorName: staffName,
      timestamp: now,
      description: `${staffName} accepted and assigned to request`,
    });
    saveStoredMockEvents(allEvts);
    success = true;

    emitRealtimeEvent({ type: 'request:updated', request: req });
  }

  return success;
}

export async function startRequest(
  requestId: string,
  staffId: string,
  staffName: string,
): Promise<boolean> {
  return updateRequestStatus(
    requestId,
    'In Progress',
    staffId,
    staffName,
    `${staffName} started working on request`,
  );
}

export async function completeRequest(
  requestId: string,
  staffId: string,
  staffName: string,
): Promise<boolean> {
  return updateRequestStatus(
    requestId,
    'Completed',
    staffId,
    staffName,
    `${staffName} completed request`,
  );
}

export async function assignRequest(
  requestId: string,
  staffId: string,
  staffName: string,
  assignerName?: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  let success = false;

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('requests')
        .update({
          assigned_staff_id: staffId,
          assigned_at: now,
          status: 'assigned',
          updated_at: now,
        })
        .eq('id', requestId);

      if (!error) {
        success = true;
        const msg = assignerName && assignerName !== staffName
          ? `Assigned to ${staffName} by ${assignerName}`
          : `Assigned to ${staffName}`;

        await supabase.from('request_events').insert({
          request_id: requestId,
          actor_type: 'staff',
          actor_id: staffId,
          event_type: 'assigned',
          message: msg,
        });
      }
    } catch (err) {
      console.warn('assignRequest Supabase error:', err);
    }
  }

  const allReqs = getStoredMockRequests();
  const req = allReqs.find((r) => r.id === requestId);
  if (req) {
    req.status = 'Assigned';
    req.assignedTo = staffId;
    req.assignedStaffName = staffName;
    req.assignedAt = now;
    saveStoredMockRequests(allReqs);

    const allEvts = getStoredMockEvents();
    allEvts.push({
      id: `evt-${Date.now()}`,
      requestId,
      eventType: 'assigned',
      actor: 'staff',
      actorName: assignerName || staffName,
      timestamp: now,
      description: assignerName && assignerName !== staffName
        ? `Assigned to ${staffName} by ${assignerName}`
        : `Assigned to ${staffName}`,
    });
    saveStoredMockEvents(allEvts);
    success = true;

    emitRealtimeEvent({ type: 'request:updated', request: req });
  }

  return success;
}

export async function escalateRequest(
  requestId: string,
  staffId: string,
  staffName: string,
  reason?: string,
): Promise<boolean> {
  const msg = reason
    ? `${staffName} escalated request: ${reason}`
    : `${staffName} escalated request to operations manager`;
  return updateRequestStatus(requestId, 'Escalated', staffId, staffName, msg);
}

export async function cancelRequest(
  requestId: string,
  staffId: string,
  staffName: string,
  reason?: string,
): Promise<boolean> {
  const msg = reason
    ? `Request cancelled by ${staffName}: ${reason}`
    : `Request cancelled by ${staffName}`;
  return updateRequestStatus(requestId, 'Cancelled', staffId, staffName, msg);
}
