import { supabase } from '@/lib/supabase';
import type { StaffProfileRow, DepartmentRow } from '@/types/database';

// ============================================================
// Staff service — fetches staff-related data from Supabase.
// ============================================================

export async function getStaffByHotel(hotelId: string): Promise<StaffProfileRow[]> {
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('id, hotel_id, user_id, first_name, last_name, email, role, department_id, username, created_at, updated_at')
    .eq('hotel_id', hotelId)
    .order('first_name');

  if (error) return [];
  return data ?? [];
}

export async function getStaffById(staffId: string): Promise<StaffProfileRow | null> {
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('id, hotel_id, user_id, first_name, last_name, email, role, department_id, username, created_at, updated_at')
    .eq('id', staffId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function getDepartmentsByHotel(hotelId: string): Promise<DepartmentRow[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('id, hotel_id, name, description, created_at')
    .eq('hotel_id', hotelId)
    .order('name');

  if (error) return [];
  return data ?? [];
}

export function getStaffFullName(profile: StaffProfileRow): string {
  return `${profile.first_name} ${profile.last_name}`;
}
