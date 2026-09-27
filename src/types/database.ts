// ============================================================
// Database row types mirroring the Supabase schema.
// These map directly to table columns and are used by the
// service layer. Domain types in /types remain the UI-facing
// shapes; services convert between the two.
// ============================================================

export interface HotelRow {
  id: string;
  name: string;
  location: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface RoomRow {
  id: string;
  hotel_id: string;
  room_number: string;
  room_type: string;
  floor: number;
  status: string;
  assigned_housekeeper_id?: string | null;
  maintenance_issue?: string | null;
  last_cleaned_at?: string | null;
  last_inspected_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuestRow {
  id: string;
  hotel_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  username: string;
  pin: string;
  created_at: string;
  updated_at: string;
}

export interface StayRow {
  id: string;
  guest_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  status: string;
  adults: number;
  children: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentRow {
  id: string;
  hotel_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface StaffProfileRow {
  id: string;
  hotel_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  role: 'staff' | 'manager';
  department_id: string | null;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface SLARuleRow {
  id: string;
  hotel_id: string;
  department_id: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  response_minutes: number;
  completion_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationRow {
  id: string;
  guest_id: string;
  stay_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_type: 'guest' | 'assistant' | 'staff';
  sender_id: string | null;
  content: string;
  request_id: string | null;
  created_at: string;
}

export interface RequestRow {
  id: string;
  hotel_id: string;
  guest_id: string;
  stay_id: string;
  room_id: string;
  conversation_id: string | null;
  department_id: string | null;
  assigned_staff_id: string | null;
  title: string;
  description: string;
  category: string;
  status: 'new' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'escalated';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  source: 'concierge' | 'staff' | 'system';
  sla_due_at: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assigned_at: string | null;
  started_at: string | null;
}

export interface RequestEventRow {
  id: string;
  request_id: string;
  actor_type: 'guest' | 'assistant' | 'staff' | 'system';
  actor_id: string | null;
  event_type: 'created' | 'routed' | 'assigned' | 'started' | 'completed' | 'escalated' | 'cancelled' | 'note';
  message: string | null;
  metadata: Record<string, string | number | boolean> | null;
  created_at: string;
}

export interface MaintenanceWorkOrderRow {
  id: string;
  hotel_id: string;
  room_id: string | null;
  request_id: string | null;
  reported_by_type: 'guest' | 'staff' | 'system';
  reported_by_guest_id: string | null;
  reported_by_staff_id: string | null;
  assigned_staff_id: string | null;
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status:
    | 'reported'
    | 'assigned'
    | 'acknowledged'
    | 'diagnosing'
    | 'repair_in_progress'
    | 'repair_completed'
    | 'verification_required'
    | 'verified'
    | 'closed'
    | 'cancelled'
    | 'deferred'
    | 'blocked'
    | 'escalated';
  room_impact: 'none' | 'maintenance' | 'out_of_order';
  room_status_before: string | null;
  due_at: string | null;
  assigned_at: string | null;
  started_at: string | null;
  diagnosed_at: string | null;
  completed_at: string | null;
  verified_at: string | null;
  closed_at: string | null;
  escalated_at: string | null;
  diagnosis: string;
  resolution: string;
  parts_materials: string;
  notes: string;
  schedule_id: string | null;
  generated_for: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceWorkOrderEventRow {
  id: string;
  work_order_id: string;
  actor_type: 'guest' | 'staff' | 'manager' | 'system';
  actor_id: string | null;
  event_type: string;
  message: string;
  metadata: Record<string, string | number | boolean> | null;
  created_at: string;
}

export interface MaintenanceAttachmentRow {
  id: string;
  work_order_id: string;
  storage_path: string;
  content_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface PreventiveMaintenanceScheduleRow {
  id: string;
  hotel_id: string;
  room_id: string | null;
  created_by: string;
  assigned_staff_id: string | null;
  assigned_department_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_due_at: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HotelKnowledgeRow {
  id: string;
  hotel_id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  source: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
