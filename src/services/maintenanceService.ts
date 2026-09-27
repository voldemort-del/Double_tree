import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  MaintenanceAction,
  MaintenanceCategory,
  MaintenanceRoomImpact,
  MaintenanceStaffAvailability,
  MaintenanceWorkOrder,
  MaintenanceWorkOrderEvent,
  MaintenanceWorkOrderStatus,
  RequestPriority,
} from '@/types';
import type { MaintenanceWorkOrderEventRow, MaintenanceWorkOrderRow } from '@/types/database';

export const MAINTENANCE_CATEGORIES: readonly MaintenanceCategory[] = [
  'Air Conditioning',
  'Plumbing',
  'Electrical',
  'Lighting',
  'TV / Entertainment',
  'Wi-Fi / Network',
  'Bathroom',
  'Door / Lock',
  'Furniture',
  'Appliances',
  'Safety',
  'General Maintenance',
  'Preventive Maintenance',
];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceWorkOrderStatus, string> = {
  reported: 'Reported',
  assigned: 'Assigned',
  acknowledged: 'Acknowledged',
  diagnosing: 'Diagnosing',
  repair_in_progress: 'Repair in progress',
  repair_completed: 'Repair completed',
  verification_required: 'Awaiting verification',
  verified: 'Verified',
  closed: 'Closed',
  cancelled: 'Cancelled',
  deferred: 'Deferred',
  blocked: 'Blocked',
  escalated: 'Escalated',
};

export const MAINTENANCE_STATUS_TRANSITIONS: Record<
  MaintenanceWorkOrderStatus,
  readonly MaintenanceAction[]
> = {
  reported: ['cancel', 'add_note'],
  assigned: ['acknowledge', 'start_diagnosis', 'blocked', 'defer', 'escalate', 'cancel', 'add_note'],
  acknowledged: ['start_diagnosis', 'blocked', 'defer', 'escalate', 'cancel', 'add_note'],
  diagnosing: ['save_diagnosis', 'start_repair', 'blocked', 'defer', 'escalate', 'cancel', 'add_note'],
  repair_in_progress: ['save_diagnosis', 'complete_repair', 'blocked', 'defer', 'escalate', 'cancel', 'add_note'],
  repair_completed: ['add_note'],
  verification_required: ['verify', 'cancel', 'add_note'],
  verified: ['close', 'reopen', 'add_note'],
  closed: ['reopen', 'add_note'],
  cancelled: ['reopen', 'add_note'],
  deferred: ['cancel', 'add_note'],
  blocked: ['cancel', 'add_note'],
  escalated: ['cancel', 'add_note'],
};

export const MAINTENANCE_ACTION_LABELS: Record<MaintenanceAction, string> = {
  assign: 'Assign technician',
  reassign: 'Reassign technician',
  unassign: 'Clear assignment',
  acknowledge: 'Acknowledge',
  start_diagnosis: 'Start diagnosis',
  save_diagnosis: 'Save diagnosis',
  start_repair: 'Start repair',
  add_note: 'Add note',
  complete_repair: 'Complete repair',
  blocked: 'Mark blocked',
  defer: 'Defer work',
  escalate: 'Escalate to manager',
  cancel: 'Cancel work order',
  set_room_impact: 'Update room impact',
  verify: 'Verify repair',
  close: 'Close work order',
  reopen: 'Reopen work order',
};

const MANAGER_ONLY_ACTIONS = new Set<MaintenanceAction>(['cancel', 'verify', 'close', 'reopen']);
const TECHNICIAN_ONLY_ACTIONS = new Set<MaintenanceAction>([
  'acknowledge', 'start_diagnosis', 'start_repair', 'complete_repair', 'escalate',
]);

export function getAvailableMaintenanceActions(
  workOrder: MaintenanceWorkOrder,
  isManager: boolean,
  staffId: string,
): MaintenanceAction[] {
  const actions = [...MAINTENANCE_STATUS_TRANSITIONS[workOrder.status]];
  if (!isManager && workOrder.assignedStaffId !== staffId) return [];
  return actions.filter((action) => (
    isManager
      ? !TECHNICIAN_ONLY_ACTIONS.has(action)
      : !MANAGER_ONLY_ACTIONS.has(action)
  ));
}

type JoinedName = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;

interface WorkOrderRow extends MaintenanceWorkOrderRow {
  rooms: { room_number: string } | { room_number: string }[] | null;
  assigned_staff: JoinedName;
  reported_staff: JoinedName;
}

type WorkOrderEventRow = MaintenanceWorkOrderEventRow;

interface MaintenanceTeamRow {
  id: string;
  first_name: string;
  last_name: string;
  department_name: string;
  availability: MaintenanceStaffAvailability['availability'];
  active_work_orders: number | string;
  overdue_work_orders: number | string;
}

const WORK_ORDER_SELECT = `
  id, hotel_id, room_id, request_id, reported_by_type, reported_by_staff_id,
  assigned_staff_id, category, title, description, priority, status, room_impact,
  due_at, created_at, updated_at, diagnosis, resolution, parts_materials, notes,
  rooms(room_number),
  assigned_staff:staff_profiles!maintenance_work_orders_assigned_staff_id_fkey(first_name, last_name),
  reported_staff:staff_profiles!maintenance_work_orders_reported_by_staff_id_fkey(first_name, last_name)
`;

function requireSupabase(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Maintenance work orders require a configured Supabase project.');
  }
}

function first<T>(joined: T | T[] | null): T | null {
  return Array.isArray(joined) ? joined[0] ?? null : joined;
}

function joinedName(joined: JoinedName): string | undefined {
  const person = first(joined);
  return person ? `${person.first_name} ${person.last_name}` : undefined;
}

function toWorkOrder(row: WorkOrderRow): MaintenanceWorkOrder {
  const room = first(row.rooms);
  const priorityLabels: Record<WorkOrderRow['priority'], RequestPriority> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };
  return {
    id: row.id,
    hotelId: row.hotel_id,
    roomId: row.room_id ?? undefined,
    roomNumber: room?.room_number,
    requestId: row.request_id ?? undefined,
    reportedByType: row.reported_by_type,
    reportedByName: joinedName(row.reported_staff),
    assignedStaffId: row.assigned_staff_id ?? undefined,
    assignedStaffName: joinedName(row.assigned_staff),
    category: row.category as MaintenanceCategory,
    title: row.title,
    description: row.description,
    priority: priorityLabels[row.priority],
    status: row.status,
    roomImpact: row.room_impact,
    dueAt: row.due_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    diagnosis: row.diagnosis,
    resolution: row.resolution,
    partsMaterials: row.parts_materials,
    notes: row.notes,
  };
}

export async function getMaintenanceWorkOrders(hotelId: string): Promise<MaintenanceWorkOrder[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('maintenance_work_orders')
    .select(WORK_ORDER_SELECT)
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Unable to load maintenance work orders: ${error.message}`);
  return ((data ?? []) as unknown as WorkOrderRow[]).map(toWorkOrder);
}

export async function getMaintenanceWorkOrder(
  hotelId: string,
  workOrderId: string,
): Promise<MaintenanceWorkOrder | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('maintenance_work_orders')
    .select(WORK_ORDER_SELECT)
    .eq('hotel_id', hotelId)
    .eq('id', workOrderId)
    .maybeSingle();
  if (error) throw new Error(`Unable to load maintenance work order: ${error.message}`);
  return data ? toWorkOrder(data as unknown as WorkOrderRow) : null;
}

export async function getMaintenanceWorkOrderEvents(
  workOrderId: string,
): Promise<MaintenanceWorkOrderEvent[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('maintenance_work_order_events')
    .select('id, work_order_id, actor_type, actor_id, event_type, message, created_at')
    .eq('work_order_id', workOrderId)
    .order('created_at');
  if (error) throw new Error(`Unable to load maintenance work order history: ${error.message}`);

  const rows = (data ?? []) as WorkOrderEventRow[];
  const staffIds = [...new Set(rows
    .filter((row) => row.actor_id && (row.actor_type === 'staff' || row.actor_type === 'manager'))
    .map((row) => row.actor_id!))];
  const names = new Map<string, string>();
  if (staffIds.length > 0) {
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, first_name, last_name')
      .in('id', staffIds);
    if (staffError) throw new Error(`Unable to load maintenance history authors: ${staffError.message}`);
    for (const member of staff ?? []) names.set(member.id, `${member.first_name} ${member.last_name}`);
  }

  return rows.map((row) => ({
    id: row.id,
    workOrderId: row.work_order_id,
    actorType: row.actor_type,
    actorName: row.actor_id ? names.get(row.actor_id) ?? 'Staff member' : row.actor_type === 'system' ? 'System' : 'Guest',
    eventType: row.event_type,
    message: row.message,
    createdAt: row.created_at,
  }));
}

export async function getMaintenanceTeam(hotelId: string): Promise<MaintenanceStaffAvailability[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('get_maintenance_team', { p_hotel_id: hotelId });
  if (error) throw new Error(`Unable to load maintenance staff availability: ${error.message}`);
  return ((data ?? []) as MaintenanceTeamRow[]).map((row) => ({
    id: row.id,
    name: `${row.first_name} ${row.last_name}`,
    departmentName: row.department_name,
    availability: row.availability,
    activeWorkOrders: Number(row.active_work_orders),
    overdueWorkOrders: Number(row.overdue_work_orders),
  }));
}

export async function createMaintenanceWorkOrder(input: {
  hotelId: string;
  roomId?: string;
  category: MaintenanceCategory;
  title: string;
  description: string;
  priority: RequestPriority;
}): Promise<string> {
  requireSupabase();
  const { data, error } = await supabase.rpc('create_maintenance_work_order', {
    p_hotel_id: input.hotelId,
    p_room_id: input.roomId ?? null,
    p_category: input.category,
    p_title: input.title.trim(),
    p_description: input.description.trim(),
    p_priority: input.priority.toLowerCase(),
    p_room_impact: 'none',
  });
  if (error) throw new Error(`Unable to create maintenance work order: ${error.message}`);
  if (!data) throw new Error('Maintenance work order creation did not return an ID.');
  return data;
}

export async function performMaintenanceAction(input: {
  workOrderId: string;
  action: MaintenanceAction;
  note?: string;
  diagnosis?: string;
  resolution?: string;
  partsMaterials?: string;
  assignedStaffId?: string;
  roomImpact?: MaintenanceRoomImpact;
}): Promise<void> {
  requireSupabase();
  const { error } = await supabase.rpc('maintenance_work_order_action', {
    p_work_order_id: input.workOrderId,
    p_action: input.action,
    p_note: input.note?.trim() || null,
    p_diagnosis: input.diagnosis?.trim() || null,
    p_resolution: input.resolution?.trim() || null,
    p_parts_materials: input.partsMaterials?.trim() || null,
    p_assigned_staff_id: input.assignedStaffId ?? null,
    p_room_impact: input.roomImpact ?? null,
  });
  if (error) throw new Error(`Unable to ${input.action.replace(/_/g, ' ')} maintenance work: ${error.message}`);
}
