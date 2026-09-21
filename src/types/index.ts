// ============================================================
// Core domain types for the DoubleTree Malta concierge platform.
// These are designed to map cleanly to future Supabase tables.
// ============================================================

export type Department =
  | 'Front Desk'
  | 'Housekeeping'
  | 'Maintenance'
  | 'Food & Beverage'
  | 'Concierge'
  | 'Spa & Wellness';

export type RequestCategory =
  | 'Housekeeping'
  | 'Maintenance'
  | 'Room Service'
  | 'Spa & Wellness'
  | 'Concierge'
  | 'Transportation'
  | 'Information'
  | 'Other';

export type RequestPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export type RequestStatus =
  | 'Submitted'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Escalated'
  | 'Overdue';

export type StaffRole = 'staff' | 'manager';

export type Actor = 'guest' | 'assistant' | 'staff' | 'system';

// ---- People ----

export interface Guest {
  id: string;
  name: string;
  username: string;
  roomNumber: string;
  pin: string;
  avatarColor: string;
  stay?: Stay;
}

export interface Staff {
  id: string;
  name: string;
  username: string;
  password: string;
  role: StaffRole;
  department: Department;
  avatarColor: string;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: string;
  view: string;
}

// ---- Stay ----

export interface Stay {
  id: string;
  guestId: string;
  roomId: string;
  checkIn: string; // ISO
  checkOut: string; // ISO
  adults: number;
  children: number;
  status: 'active' | 'upcoming' | 'completed';
}

// ---- SLA ----

export interface SLARule {
  id: string;
  category: RequestCategory;
  priority: RequestPriority;
  targetMinutes: number;
}

// ---- Requests ----

export interface HotelRequest {
  id: string;
  shortId: string;
  guestId: string;
  roomId: string;
  roomNumber: string;
  conversationId?: string;
  title: string;
  description: string;
  category: RequestCategory;
  department: Department;
  priority: RequestPriority;
  status: RequestStatus;
  assignedTo?: string; // staff id
  guestName?: string;
  assignedStaffName?: string;
  createdAt: string; // ISO
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  slaTargetMinutes: number;
  slaDeadline: string; // ISO
}

// ---- Request events / timeline ----

export interface RequestEvent {
  id: string;
  requestId: string;
  eventType: 'created' | 'routed' | 'assigned' | 'started' | 'completed' | 'escalated' | 'cancelled' | 'note';
  actor: Actor;
  actorName: string;
  timestamp: string; // ISO
  description: string;
  metadata?: Record<string, string | number | boolean>;
}

// ---- Conversation ----

export type MessageRole = 'guest' | 'assistant';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  timestamp: string; // ISO
  requestId?: string; // if this message produced a request
}

export interface Conversation {
  id: string;
  guestId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  lastActivityAt: string;
}

// ---- Auth session ----

export interface GuestSession {
  type: 'guest';
  guestId: string;
  name: string;
  roomNumber: string;
}

export interface StaffSession {
  type: 'staff' | 'manager';
  staffId: string;
  name: string;
  role: StaffRole;
  department: Department;
}

export type Session = GuestSession | StaffSession | null;
