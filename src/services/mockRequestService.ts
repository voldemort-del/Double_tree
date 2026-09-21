import type { HotelRequest, RequestEvent, RequestStatus } from '@/types';
import { initialRequests, initialEvents, slaForCategory, guests, rooms } from '@/data/mockData';
import { categoryToDepartment } from '@/utils/format';

// ============================================================
// Mock request service — in-memory store.
// Swap with Supabase queries later — interface stays the same.
// ============================================================

let requests: HotelRequest[] = [...initialRequests];
let events: RequestEvent[] = [...initialEvents];
let counter = 1100;

function newShortId(): string {
  return `#${counter++}`;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export const mockRequestService = {
  getAllRequests(): HotelRequest[] {
    return [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getRequestsByGuest(guestId: string): HotelRequest[] {
    return requests
      .filter((r) => r.guestId === guestId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getRequestById(id: string): HotelRequest | undefined {
    return requests.find((r) => r.id === id || r.shortId === id);
  },

  getEventsByRequest(requestId: string): RequestEvent[] {
    return events
      .filter((e) => e.requestId === requestId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  createRequest(input: {
    guestId: string;
    roomNumber: string;
    title: string;
    description: string;
    category: HotelRequest['category'];
    priority: HotelRequest['priority'];
    conversationId?: string;
  }): HotelRequest {
    const guest = guests.find((g) => g.id === input.guestId);
    const room = rooms.find((r) => r.number === input.roomNumber);
    const dept = categoryToDepartment(input.category);
    const sla = slaForCategory(input.category, input.priority);
    const now = new Date().toISOString();
    const reqId = newId('req');
    const shortId = newShortId();
    const deadline = new Date(Date.now() + sla * 60000).toISOString();

    const request: HotelRequest = {
      id: reqId,
      shortId,
      guestId: input.guestId,
      roomId: room?.id ?? `r-${input.roomNumber}`,
      roomNumber: input.roomNumber,
      conversationId: input.conversationId,
      title: input.title,
      description: input.description,
      category: input.category,
      department: dept,
      priority: input.priority,
      status: 'Submitted',
      createdAt: now,
      slaTargetMinutes: sla,
      slaDeadline: deadline,
    };

    requests = [request, ...requests];

    const createdEvent: RequestEvent = {
      id: newId('e'),
      requestId: reqId,
      eventType: 'created',
      actor: 'guest',
      actorName: guest?.name ?? 'Guest',
      timestamp: now,
      description: 'Request submitted',
    };
    const routedEvent: RequestEvent = {
      id: newId('e'),
      requestId: reqId,
      eventType: 'routed',
      actor: 'assistant',
      actorName: 'Concierge AI',
      timestamp: now,
      description: `Sent to ${dept}`,
    };
    events = [...events, createdEvent, routedEvent];

    return request;
  },

  updateStatus(requestId: string, status: RequestStatus, staffName: string): void {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;
    const now = new Date().toISOString();
    req.status = status;

    const eventMap: Record<RequestStatus, { eventType: RequestEvent['eventType']; description: string }> = {
      Submitted: { eventType: 'created', description: 'Request submitted' },
      Assigned: { eventType: 'assigned', description: `${staffName} assigned` },
      'In Progress': { eventType: 'started', description: 'Request in progress' },
      Completed: { eventType: 'completed', description: 'Request completed' },
      Cancelled: { eventType: 'cancelled', description: 'Request cancelled' },
      Escalated: { eventType: 'escalated', description: 'Request escalated' },
      Overdue: { eventType: 'escalated', description: 'SLA deadline passed — escalated' },
    };

    const info = eventMap[status];
    if (status === 'Assigned' && !req.assignedAt) req.assignedAt = now;
    if (status === 'In Progress' && !req.startedAt) req.startedAt = now;
    if (status === 'Completed' && !req.completedAt) req.completedAt = now;

    const evt: RequestEvent = {
      id: newId('e'),
      requestId,
      eventType: info.eventType,
      actor: 'staff',
      actorName: staffName,
      timestamp: now,
      description: info.description,
    };
    events = [...events, evt];
  },

  assign(requestId: string, staffId: string, staffName: string): void {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;
    const now = new Date().toISOString();
    req.assignedTo = staffId;
    if (!req.assignedAt) req.assignedAt = now;
    if (req.status === 'Submitted') req.status = 'Assigned';

    const evt: RequestEvent = {
      id: newId('e'),
      requestId,
      eventType: 'assigned',
      actor: 'staff',
      actorName: staffName,
      timestamp: now,
      description: `${staffName} assigned`,
    };
    events = [...events, evt];
  },

  escalate(requestId: string, staffName: string): void {
    this.updateStatus(requestId, 'Escalated', staffName);
  },
};
