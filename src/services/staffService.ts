import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { StaffProfileRow, DepartmentRow } from '@/types/database';

// ============================================================
// Staff service — fetches staff-related data from Supabase.
// ============================================================

export interface StaffWithDepartment extends StaffProfileRow {
  departments?: { name: string } | { name: string }[] | null;
  departmentName?: string;
}

function departmentNameFromRow(row: { departments?: { name: string } | { name: string }[] | null }): string | undefined {
  const d = row.departments;
  if (!d) return undefined;
  if (Array.isArray(d)) return d[0]?.name;
  return d.name;
}

const DEMO_STAFF: StaffWithDepartment[] = [
  {
    id: 'st-1',
    hotel_id: 'a0000000-0000-0000-0000-000000000001',
    user_id: null,
    first_name: 'Maria',
    last_name: 'Vella',
    email: 'maria.vella@doubletreemalta.com',
    role: 'staff',
    department_id: 'dept-fb',
    username: 'staff',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    departmentName: 'Food & Beverage',
  },
  {
    id: 'st-2',
    hotel_id: 'a0000000-0000-0000-0000-000000000001',
    user_id: null,
    first_name: 'Daniel',
    last_name: 'Zahra',
    email: 'daniel.zahra@doubletreemalta.com',
    role: 'staff',
    department_id: 'dept-fb',
    username: 'staff2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    departmentName: 'Food & Beverage',
  },
  {
    id: 'st-3',
    hotel_id: 'a0000000-0000-0000-0000-000000000001',
    user_id: null,
    first_name: 'Lucia',
    last_name: 'Grech',
    email: 'lucia.grech@doubletreemalta.com',
    role: 'staff',
    department_id: 'dept-fb',
    username: 'staff3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    departmentName: 'Food & Beverage',
  },
  {
    id: 'st-4',
    hotel_id: 'a0000000-0000-0000-0000-000000000001',
    user_id: null,
    first_name: 'Marco',
    last_name: 'Bonnici',
    email: 'marco.bonnici@doubletreemalta.com',
    role: 'staff',
    department_id: 'dept-fb',
    username: 'staff4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    departmentName: 'Food & Beverage',
  },
  {
    id: 'st-5',
    hotel_id: 'a0000000-0000-0000-0000-000000000001',
    user_id: null,
    first_name: 'Elena',
    last_name: 'Borg',
    email: 'elena.borg@doubletreemalta.com',
    role: 'staff',
    department_id: 'dept-fb',
    username: 'staff5',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    departmentName: 'Food & Beverage',
  },
  {
    id: 'st-mgr',
    hotel_id: 'a0000000-0000-0000-0000-000000000001',
    user_id: null,
    first_name: 'Antoine',
    last_name: 'Caruana',
    email: 'antoine.caruana@doubletreemalta.com',
    role: 'manager',
    department_id: 'dept-fd',
    username: 'manager',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    departmentName: 'Front Desk',
  },
];

export async function getStaffByHotel(hotelId: string): Promise<StaffWithDepartment[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select(`
          id, hotel_id, user_id, first_name, last_name, email, role, department_id, username, created_at, updated_at,
          departments(name)
        `)
        .eq('hotel_id', hotelId)
        .order('first_name');

      if (!error && data && data.length > 0) {
        return (data as any[]).map((s) => ({
          ...s,
          departments: Array.isArray(s.departments) ? s.departments[0] ?? null : s.departments,
          departmentName: s.role === 'staff' ? 'Food & Beverage' : departmentNameFromRow(s),
        }));
      }
    } catch (err) {
      console.warn('getStaffByHotel error, falling back to mock:', err);
    }
  }

  return DEMO_STAFF;
}

export async function getStaffById(staffId: string): Promise<StaffWithDepartment | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select(`
          id, hotel_id, user_id, first_name, last_name, email, role, department_id, username, created_at, updated_at,
          departments(name)
        `)
        .eq('id', staffId)
        .maybeSingle();

      if (!error && data) {
        const row = data as any;
        return {
          ...row,
          departments: Array.isArray(row.departments) ? row.departments[0] ?? null : row.departments,
          departmentName: row.role === 'staff' ? 'Food & Beverage' : departmentNameFromRow(row),
        };
      }

    } catch (err) {
      console.warn('getStaffById error:', err);
    }
  }

  return DEMO_STAFF.find((s) => s.id === staffId) ?? null;
}

export async function getDepartmentsByHotel(hotelId: string): Promise<DepartmentRow[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, hotel_id, name, description, created_at')
        .eq('hotel_id', hotelId)
        .order('name');

      if (!error && data && data.length > 0) return data;
    } catch (err) {
      console.warn('getDepartmentsByHotel error:', err);
    }
  }

  return [
    { id: 'dept-fd', hotel_id: hotelId, name: 'Front Desk', description: 'Front office', created_at: new Date().toISOString() },
    { id: 'dept-hk', hotel_id: hotelId, name: 'Housekeeping', description: 'Housekeeping', created_at: new Date().toISOString() },
    { id: 'dept-maint', hotel_id: hotelId, name: 'Maintenance', description: 'Facilities', created_at: new Date().toISOString() },
    { id: 'dept-fb', hotel_id: hotelId, name: 'Food & Beverage', description: 'Dining', created_at: new Date().toISOString() },
    { id: 'dept-concierge', hotel_id: hotelId, name: 'Concierge', description: 'Concierge', created_at: new Date().toISOString() },
    { id: 'dept-spa', hotel_id: hotelId, name: 'Spa & Wellness', description: 'Spa', created_at: new Date().toISOString() },
  ];
}

export function getStaffFullName(profile: StaffProfileRow): string {
  return `${profile.first_name} ${profile.last_name}`;
}
