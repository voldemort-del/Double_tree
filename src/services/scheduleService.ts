import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Department, ShiftHandover, ShiftHandoverItem, StaffShift } from '@/types';

type ShiftRow = {
  id: string; hotel_id: string; staff_id: string; department_id: string | null;
  shift_date: string; start_time: string; end_time: string; shift_type: StaffShift['shiftType'];
  status: StaffShift['status']; notes: string; created_at: string; updated_at: string;
  staff_profiles: { first_name: string; last_name: string } | null;
  departments: { name: string } | null;
};

function toShift(row: ShiftRow): StaffShift {
  return {
    id: row.id, hotelId: row.hotel_id, staffId: row.staff_id,
    staffName: row.staff_profiles ? `${row.staff_profiles.first_name} ${row.staff_profiles.last_name}` : 'Staff member',
    departmentId: row.department_id ?? undefined, departmentName: row.departments?.name ?? 'Unassigned',
    date: row.shift_date, startTime: row.start_time, endTime: row.end_time,
    shiftType: row.shift_type, status: row.status, notes: row.notes,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

const SHIFT_SELECT = `
  id, hotel_id, staff_id, department_id, shift_date, start_time, end_time,
  shift_type, status, notes, created_at, updated_at,
  staff_profiles(first_name, last_name), departments(name)
`;

export async function getStaffShifts(hotelId: string, startDate: string, endDate: string): Promise<StaffShift[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('staff_shifts').select(SHIFT_SELECT)
    .eq('hotel_id', hotelId).gte('shift_date', startDate).lte('shift_date', endDate)
    .order('shift_date').order('start_time');
  if (error) throw new Error(`Unable to load staff schedule: ${error.message}`);
  return (data ?? []).map((row) => toShift(row as unknown as ShiftRow));
}

export async function createStaffShift(input: {
  hotelId: string; staffId: string; departmentId?: string; date: string;
  startTime: string; endTime: string; shiftType: StaffShift['shiftType']; notes: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_staff_shift', {
    p_hotel_id: input.hotelId, p_staff_id: input.staffId, p_department_id: input.departmentId ?? null,
    p_shift_date: input.date, p_start_time: input.startTime, p_end_time: input.endTime,
    p_shift_type: input.shiftType, p_notes: input.notes,
  });
  if (error) throw new Error(`Unable to create shift: ${error.message}`);
  return data as string;
}

export async function updateStaffShift(input: {
  id: string; date: string; startTime: string; endTime: string;
  shiftType: StaffShift['shiftType']; status: StaffShift['status']; notes: string;
}): Promise<void> {
  const { error } = await supabase.rpc('update_staff_shift', {
    p_shift_id: input.id, p_shift_date: input.date, p_start_time: input.startTime,
    p_end_time: input.endTime, p_shift_type: input.shiftType, p_status: input.status, p_notes: input.notes,
  });
  if (error) throw new Error(`Unable to update shift: ${error.message}`);
}

export async function cancelStaffShift(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_staff_shift', { p_shift_id: id });
  if (error) throw new Error(`Unable to cancel shift: ${error.message}`);
}

export async function startStaffShift(id: string): Promise<void> {
  const { error } = await supabase.rpc('start_staff_shift', { p_shift_id: id });
  if (error) throw new Error(`Unable to start shift: ${error.message}`);
}

export async function endStaffShift(id: string): Promise<void> {
  const { error } = await supabase.rpc('end_staff_shift', { p_shift_id: id });
  if (error) throw new Error(`Unable to end shift: ${error.message}`);
}

type HandoverRow = {
  id: string; hotel_id: string; shift_id: string | null; created_by: string; notes: string;
  status: ShiftHandover['status']; created_at: string;
  staff_profiles: { first_name: string; last_name: string } | null;
  departments: { name: string } | null;
};
type HandoverItemRow = {
  id: string; handover_id: string; item_type: ShiftHandoverItem['itemType'];
  request_id: string | null; maintenance_work_order_id: string | null; housekeeping_task_id: string | null;
  room_id: string | null; title: string; note: string; status: ShiftHandoverItem['status'];
  assigned_staff_id: string | null; manager_attention: boolean; created_at: string;
  rooms: { room_number: string } | null;
  staff_profiles: { first_name: string; last_name: string } | null;
};

export async function getHandovers(hotelId: string): Promise<ShiftHandover[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('shift_handovers').select(`
    id, hotel_id, shift_id, created_by, notes, status, created_at,
    staff_profiles!created_by(first_name, last_name)
  `).eq('hotel_id', hotelId).order('created_at', { ascending: false });
  if (error) throw new Error(`Unable to load handovers: ${error.message}`);
  const handovers = (data ?? []) as unknown as HandoverRow[];
  if (!handovers.length) return [];
  const { data: itemData, error: itemError } = await supabase.from('shift_handover_items').select(`
    id, handover_id, item_type, request_id, maintenance_work_order_id, housekeeping_task_id,
    room_id, title, note, status, assigned_staff_id, manager_attention, created_at,
    rooms(room_number), staff_profiles(first_name, last_name)
  `).in('handover_id', handovers.map((item) => item.id));
  if (itemError) throw new Error(`Unable to load handover items: ${itemError.message}`);
  const items = (itemData ?? []) as unknown as HandoverItemRow[];
  return handovers.map((row) => ({
    id: row.id, hotelId: row.hotel_id, shiftId: row.shift_id ?? undefined, createdBy: row.created_by,
    createdByName: row.staff_profiles ? `${row.staff_profiles.first_name} ${row.staff_profiles.last_name}` : 'Staff member',
    departmentName: row.departments?.name ?? 'Operations', notes: row.notes, status: row.status, createdAt: row.created_at,
    items: items.filter((item) => item.handover_id === row.id).map((item) => ({
      id: item.id, handoverId: item.handover_id, itemType: item.item_type, requestId: item.request_id ?? undefined,
      maintenanceWorkOrderId: item.maintenance_work_order_id ?? undefined,
      housekeepingTaskId: item.housekeeping_task_id ?? undefined, roomId: item.room_id ?? undefined,
      roomNumber: item.rooms?.room_number, title: item.title, note: item.note, status: item.status,
      assignedStaffId: item.assigned_staff_id ?? undefined,
      assignedStaffName: item.staff_profiles ? `${item.staff_profiles.first_name} ${item.staff_profiles.last_name}` : undefined,
      managerAttention: item.manager_attention, createdAt: item.created_at,
    })),
  }));
}

export async function createShiftHandover(shiftId: string, notes: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_shift_handover', { p_shift_id: shiftId, p_notes: notes });
  if (error) throw new Error(`Unable to create handover: ${error.message}`);
  return data as string;
}

export async function updateHandoverItem(input: {
  id: string; status: ShiftHandoverItem['status']; note: string;
  assignedStaffId?: string; managerAttention: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('update_shift_handover_item', {
    p_item_id: input.id, p_status: input.status, p_note: input.note,
    p_assigned_staff_id: input.assignedStaffId ?? null, p_manager_attention: input.managerAttention,
  });
  if (error) throw new Error(`Unable to update handover item: ${error.message}`);
}
