import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  HousekeepingStaffAvailability,
  HousekeepingTask,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  RequestPriority,
  RoomOperationsRoom,
  RoomStatus,
} from '@/types';

interface RoomOperationsRow {
  id: string;
  hotel_id: string;
  room_number: string;
  room_type: string;
  floor: number;
  status: RoomStatus;
  updated_at: string;
  stay_id: string | null;
  guest_id: string | null;
  guest_name: string | null;
  assigned_housekeeper_id: string | null;
  housekeeper_first_name: string | null;
  housekeeper_last_name: string | null;
  maintenance_issue: string | null;
  last_cleaned_at: string | null;
  last_inspected_at: string | null;
  notes: string | null;
}

interface HousekeepingTaskRow {
  id: string;
  hotel_id: string;
  room_id: string;
  request_id: string | null;
  assigned_staff_id: string | null;
  task_type: HousekeepingTaskType;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: HousekeepingTaskStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  due_at: string | null;
  notes: string;
  rooms: { room_number: string; room_type: string; floor: number };
  requests: { status: string } | null;
  staff_profiles: { first_name: string; last_name: string } | null;
}

interface HousekeepingTeamRow {
  id: string;
  first_name: string;
  last_name: string;
  department_name: string | null;
  availability: HousekeepingStaffAvailability['availability'];
  active_tasks: number | string;
}

function requireSupabase(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Room operations require a configured Supabase project.');
  }
}

function toTask(row: HousekeepingTaskRow): HousekeepingTask {
  const priorityLabels: Record<HousekeepingTaskRow['priority'], RequestPriority> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };
  return {
    id: row.id,
    hotelId: row.hotel_id,
    roomId: row.room_id,
    roomNumber: row.rooms.room_number,
    roomType: row.rooms.room_type,
    floor: row.rooms.floor,
    requestId: row.request_id ?? undefined,
    requestStatus: row.requests?.status,
    assignedStaffId: row.assigned_staff_id ?? undefined,
    assignedStaffName: row.staff_profiles
      ? `${row.staff_profiles.first_name} ${row.staff_profiles.last_name}`
      : undefined,
    taskType: row.task_type,
    title: row.title,
    description: row.description,
    priority: priorityLabels[row.priority],
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    dueAt: row.due_at ?? undefined,
    notes: row.notes,
  };
}

export async function getRoomOperations(hotelId: string): Promise<RoomOperationsRoom[]> {
  if (!isSupabaseConfigured) return [];
  const { data: rooms, error } = await supabase
    .from('room_operations')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('floor')
    .order('room_number');
  if (error) throw new Error(`Unable to load room operations: ${error.message}`);

  const { data: inspections, error: taskError } = await supabase
    .from('housekeeping_tasks')
    .select('room_id')
    .eq('hotel_id', hotelId)
    .eq('task_type', 'inspection')
    .in('status', ['pending', 'assigned', 'in_progress', 'paused']);
  if (taskError) throw new Error(`Unable to load inspection status: ${taskError.message}`);

  const awaitingInspection = new Set((inspections ?? []).map((task) => task.room_id));
  return ((rooms ?? []) as unknown as RoomOperationsRow[]).map((row) => ({
    id: row.id,
    hotelId: row.hotel_id,
    roomNumber: row.room_number,
    roomType: row.room_type,
    floor: row.floor,
    status: row.status,
    stayId: row.stay_id ?? undefined,
    guestId: row.guest_id ?? undefined,
    guestName: row.guest_name ?? undefined,
    assignedHousekeeperId: row.assigned_housekeeper_id ?? undefined,
    housekeeperName: row.housekeeper_first_name
      ? `${row.housekeeper_first_name} ${row.housekeeper_last_name ?? ''}`.trim()
      : undefined,
    maintenanceIssue: row.maintenance_issue ?? undefined,
    lastCleanedAt: row.last_cleaned_at ?? undefined,
    lastInspectedAt: row.last_inspected_at ?? undefined,
    notes: row.notes ?? undefined,
    updatedAt: row.updated_at,
    awaitingInspection: awaitingInspection.has(row.id),
  }));
}

export async function getHousekeepingTasks(
  hotelId: string,
  staffId?: string,
): Promise<HousekeepingTask[]> {
  if (!isSupabaseConfigured) return [];
  let query = supabase
    .from('housekeeping_tasks')
    .select(`
      id, hotel_id, room_id, request_id, assigned_staff_id, task_type, title, description,
      priority, status, created_at, started_at, completed_at, due_at, notes,
      rooms!inner(room_number, room_type, floor),
      requests(status),
      staff_profiles(first_name, last_name)
    `)
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false });

  if (staffId) {
    query = query.or(`assigned_staff_id.is.null,assigned_staff_id.eq.${staffId}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Unable to load housekeeping tasks: ${error.message}`);
  return ((data ?? []) as unknown as HousekeepingTaskRow[]).map(toTask);
}

export async function getHousekeepingTeam(hotelId: string): Promise<HousekeepingStaffAvailability[]> {
  requireSupabase();
  const { data, error } = await supabase.rpc('get_housekeeping_team', { p_hotel_id: hotelId });
  if (error) throw new Error(`Unable to load housekeeping availability: ${error.message}`);
  return ((data ?? []) as HousekeepingTeamRow[]).map((row) => ({
    id: row.id,
    name: `${row.first_name} ${row.last_name}`,
    departmentName: row.department_name ?? 'Housekeeping eligible',
    availability: row.availability,
    activeTasks: Number(row.active_tasks),
  }));
}

export async function performHousekeepingAction(input: {
  taskId: string;
  action: string;
  note?: string;
  assignedStaffId?: string;
  inspectionPassed?: boolean;
}): Promise<string> {
  requireSupabase();
  const { data, error } = await supabase.rpc('perform_housekeeping_action', {
    p_task_id: input.taskId,
    p_action: input.action,
    p_note: input.note ?? null,
    p_assigned_staff_id: input.assignedStaffId ?? null,
    p_inspection_passed: input.inspectionPassed ?? null,
  });
  if (error) throw new Error(`Unable to ${input.action.replace(/_/g, ' ')}: ${error.message}`);
  return data;
}

export async function setStaffAvailability(status: 'available' | 'busy' | 'off_shift'): Promise<void> {
  requireSupabase();
  const { error } = await supabase.rpc('set_staff_availability', { p_status: status });
  if (error) throw new Error(`Unable to update availability: ${error.message}`);
}

export async function setRoomOperationalStatus(
  roomId: string,
  status: Extract<RoomStatus, 'maintenance' | 'out_of_order' | 'vacant' | 'dirty'>,
  note?: string,
): Promise<void> {
  requireSupabase();
  const { error } = await supabase.rpc('set_room_operational_status', {
    p_room_id: roomId,
    p_status: status,
    p_note: note ?? null,
  });
  if (error) throw new Error(`Unable to update room status: ${error.message}`);
}

export async function checkoutRoom(roomId: string): Promise<void> {
  requireSupabase();
  const { error } = await supabase.rpc('checkout_room', { p_room_id: roomId });
  if (error) throw new Error(`Unable to check out room: ${error.message}`);
}

export async function createRoomTask(input: {
  roomId: string;
  taskType: HousekeepingTaskType;
  title: string;
  description: string;
  priority: RequestPriority;
}): Promise<string> {
  requireSupabase();
  const { data, error } = await supabase.rpc('create_room_task', {
    p_room_id: input.roomId,
    p_task_type: input.taskType,
    p_title: input.title,
    p_description: input.description,
    p_priority: input.priority.toLowerCase(),
    p_due_at: null,
  });
  if (error) throw new Error(`Unable to create room task: ${error.message}`);
  return data;
}
