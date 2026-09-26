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
  | 'Spa & Wellness'
  | 'Pool & Recreation'
  | 'Management';

export type MenuVenue = 'restaurant' | 'bar' | 'room_service' | 'pool_bar';

export type BookingServiceType = 'spa' | 'gym' | 'pool_session' | 'beach_club' | 'kids_club';

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed';

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

export type RoomStatus =
  | 'occupied'
  | 'vacant'
  | 'dirty'
  | 'cleaning'
  | 'inspected'
  | 'ready'
  | 'maintenance'
  | 'out_of_order';

export interface RoomOperationsRoom {
  id: string;
  hotelId: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  status: RoomStatus;
  stayId?: string;
  guestId?: string;
  guestName?: string;
  assignedHousekeeperId?: string;
  housekeeperName?: string;
  maintenanceIssue?: string;
  lastCleanedAt?: string;
  lastInspectedAt?: string;
  notes?: string;
  updatedAt: string;
  awaitingInspection: boolean;
}

export type HousekeepingTaskType =
  | 'room_cleaning'
  | 'stayover_cleaning'
  | 'deep_cleaning'
  | 'towel_replacement'
  | 'linen_replacement'
  | 'amenity_restocking'
  | 'minibar_restocking'
  | 'inspection'
  | 'special_guest_request';

export type HousekeepingTaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface HousekeepingTask {
  id: string;
  hotelId: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  requestId?: string;
  requestStatus?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  taskType: HousekeepingTaskType;
  title: string;
  description: string;
  priority: RequestPriority;
  status: HousekeepingTaskStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  dueAt?: string;
  notes: string;
}

export interface HousekeepingStaffAvailability {
  id: string;
  name: string;
  departmentName: string;
  availability: 'available' | 'busy' | 'off_shift';
  activeTasks: number;
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

// ---- Menu Items ----

export interface MenuItem {
  id: string;
  hotelId: string;
  venue: MenuVenue;
  category: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  availableForRoomService: boolean;
  imageUrl?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ---- Bookings ----

export interface Booking {
  id: string;
  hotelId: string;
  guestId: string;
  stayId: string;
  requestId?: string;
  serviceType: BookingServiceType;
  serviceName: string;
  bookingDate: string; // ISO date YYYY-MM-DD
  startTime: string;   // HH:MM
  durationMinutes: number;
  capacity: number;
  status: BookingStatus;
  notes: string;
  createdAt: string;
}

export interface BookingDetails {
  serviceType: BookingServiceType;
  serviceName: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  durationMinutes: number;
}
