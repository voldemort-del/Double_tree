import { supabase } from '@/lib/supabase';
import type { RequestRow, RequestEventRow, SLARuleRow, DepartmentRow } from '@/types/database';
import type { HotelRequest, RequestEvent, RequestStatus, RequestPriority, Department } from '@/types';

// ============================================================
// Request service — handles all request CRUD and lifecycle
// operations against Supabase. Converts between database rows
// and the UI-facing domain types.
// ============================================================

// ---- Department mapping ----

const CATEGORY_TO_DEPT: Record<string, string> = {
  Housekeeping: 'Housekeeping',
  Maintenance: 'Maintenance',
  'Room Service': 'Food & Beverage',
  'Spa & Wellness': 'Spa & Wellness',
  Transportation: 'Concierge',
  Concierge: 'Concierge',
  Information: 'Front Desk',
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
    roomNumber: row.rooms?.room_number ?? '',
    conversationId: row.conversation_id ?? undefined,
    title: row.title,
    description: row.description,
    category: row.category as HotelRequest['category'],
    department: (row.departments?.name ?? 'Front Desk') as Department,
    priority: capitalizePriority(row.priority),
    status: dbStatusToUi(row.status),
    assignedTo: row.assigned_staff_id ?? undefined,
    guestName: row.guests ? `${row.guests.first_name} ${row.guests.last_name}` : undefined,
    assignedStaffName: row.staff_profiles ? `${row.staff_profiles.first_name} ${row.staff_profiles.last_name}` : undefined,
    createdAt: row.created_at,
    assignedAt: row.assigned_at ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    slaTargetMinutes: 60, // computed from SLA rules at creation
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
  const { data, error } = await supabase
    .from('requests')
    .select(REQUEST_SELECT)
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data as EnrichedRequest[]).map(rowToRequest);
}

export async function getGuestRequests(guestId: string): Promise<HotelRequest[]> {
  const { data, error } = await supabase
    .from('requests')
    .select(REQUEST_SELECT)
    .eq('guest_id', guestId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data as EnrichedRequest[]).map(rowToRequest);
}

export async function getRequestById(id: string): Promise<HotelRequest | null> {
  const { data, error } = await supabase
    .from('requests')
    .select(REQUEST_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToRequest(data as EnrichedRequest);
}

export async function getRequestEvents(requestId: string): Promise<RequestEvent[]> {
  const { data: events, error } = await supabase
    .from('request_events')
    .select('id, request_id, actor_type, actor_id, event_type, message, metadata, created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error || !events) return [];

  // Fetch staff names for events with actor_id
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

// ---- SLA ----

export async function getSlaMinutes(hotelId: string, priority: RequestPriority): Promise<number> {
  const { data, error } = await supabase
    .from('sla_rules')
    .select('id, hotel_id, department_id, priority, response_minutes, completion_minutes, created_at, updated_at')
    .eq('hotel_id', hotelId)
    .eq('priority', uiPriorityToDb(priority))
    .maybeSingle();

  if (error || !data) return 60;
  return (data as SLARuleRow).completion_minutes;
}

// ---- Department lookup ----

export async function getDepartmentByName(hotelId: string, name: string): Promise<DepartmentRow | null> {
  const { data, error } = await supabase
    .from('departments')
    .select('id, hotel_id, name, description, created_at')
    .eq('hotel_id', hotelId)
    .eq('name', name)
    .maybeSingle();

  if (error || !data) return null;
  return data as DepartmentRow;
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
  source?: string;
}

export async function createRequest(input: CreateRequestInput): Promise<HotelRequest | null> {
  const deptName = CATEGORY_TO_DEPT[input.category] ?? 'Front Desk';
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

  if (error || !request) return null;

  const req = rowToRequest(request as EnrichedRequest);

  // Create initial events
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

  return req;
}

// ---- Status transitions ----

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  staffId: string,
  staffName: string,
): Promise<void> {
  const dbStatus = uiStatusToDb(status);
  const updates: Record<string, string> = { status: dbStatus };

  if (status === 'Assigned' ) updates.assigned_at = new Date().toISOString();
  if (status === 'In Progress') updates.started_at = new Date().toISOString();
  if (status === 'Completed') updates.completed_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('requests')
    .update(updates)
    .eq('id', requestId);

  if (updateError) return;

  const eventMessages: Record<RequestStatus, string> = {
    Submitted: 'Request submitted',
    Assigned: `${staffName} assigned`,
    'In Progress': 'Request in progress',
    Completed: 'Request completed',
    Cancelled: 'Request cancelled',
    Escalated: 'Request escalated',
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

export async function assignRequest(
  requestId: string,
  staffId: string,
  staffName: string,
): Promise<void> {
  const { error } = await supabase
    .from('requests')
    .update({
      assigned_staff_id: staffId,
      assigned_at: new Date().toISOString(),
      status: 'assigned',
    })
    .eq('id', requestId);

  if (error) return;

  await supabase.from('request_events').insert({
    request_id: requestId,
    actor_type: 'staff',
    actor_id: staffId,
    event_type: 'assigned',
    message: `${staffName} assigned`,
  });
}

export async function escalateRequest(
  requestId: string,
  staffId: string,
  staffName: string,
): Promise<void> {
  await updateRequestStatus(requestId, 'Escalated', staffId, staffName);
}
