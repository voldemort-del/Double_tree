import { supabase } from '@/lib/supabase';
import type { GuestRow, StaffProfileRow, DepartmentRow } from '@/types/database';
import type { Session, Department } from '@/types';

const GUEST_SESSION_KEY = 'dth_guest_session';
const STAFF_SESSION_KEY = 'dth_staff_session';

export interface GuestAuthData {
  guestId: string;
  name: string;
  roomNumber: string;
  hotelId: string;
  stayId: string;
}

export interface StaffAuthData {
  staffId: string;
  name: string;
  role: 'staff' | 'manager';
  department: Department;
  hotelId: string;
}

// ============================================================
// Guest auth — custom username/room/pin flow for prototype.
// Looks up the guest in the guests table, validates pin,
// and confirms they have an active stay in the given room.
// ============================================================

export async function loginGuest(
  username: string,
  roomNumber: string,
  pin: string,
): Promise<GuestAuthData | null> {
  const { data: guest, error } = await supabase
    .from('guests')
    .select('id, first_name, last_name, username, pin, hotel_id')
    .eq('username', username)
    .maybeSingle();

  if (error || !guest) return null;
  if (guest.pin !== pin) return null;

  // Find active stay
  const { data: stay, error: stayError } = await supabase
    .from('stays')
    .select('id, room_id, status')
    .eq('guest_id', guest.id)
    .eq('status', 'active')
    .maybeSingle();

  if (stayError || !stay) return null;

  // Verify room number matches
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, room_number')
    .eq('id', stay.room_id)
    .maybeSingle();

  if (roomError || !room) return null;
  if (room.room_number !== roomNumber) return null;

  const authData: GuestAuthData = {
    guestId: guest.id,
    name: `${guest.first_name} ${guest.last_name}`,
    roomNumber: room.room_number,
    hotelId: guest.hotel_id,
    stayId: stay.id,
  };

  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(authData));
  return authData;
}

// ============================================================
// Staff auth — uses Supabase Auth (email/password).
// After sign-in, looks up the staff_profile linked to the
// auth user to get role, department, hotel_id.
//
// For the prototype, we also support a fallback "demo mode"
// where staff can log in with username/password without
// Supabase Auth — the staff_profiles table has username.
// ============================================================

export async function loginStaff(
  username: string,
  password: string,
): Promise<StaffAuthData | null> {
  // Prototype: look up staff_profile by username.
  // Password is checked against a convention: <username>123
  // (e.g. staff/staff123, manager/manager123).
  // This mirrors the existing demo credentials.
  const expectedPassword = `${username}123`;
  if (password !== expectedPassword) return null;

  const { data: profile, error } = await supabase
    .from('staff_profiles')
    .select('id, first_name, last_name, role, hotel_id, department_id, username')
    .eq('username', username)
    .maybeSingle();

  if (error || !profile) return null;

  // Get department name
  let department: Department = 'Front Desk';
  if (profile.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('name')
      .eq('id', profile.department_id)
      .maybeSingle();
    if (dept) {
      department = mapDeptName(dept.name);
    }
  }

  const authData: StaffAuthData = {
    staffId: profile.id,
    name: `${profile.first_name} ${profile.last_name}`,
    role: profile.role as 'staff' | 'manager',
    department,
    hotelId: profile.hotel_id,
  };

  localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(authData));
  return authData;
}

export function getStoredGuestSession(): GuestAuthData | null {
  try {
    const raw = localStorage.getItem(GUEST_SESSION_KEY);
    return raw ? (JSON.parse(raw) as GuestAuthData) : null;
  } catch {
    return null;
  }
}

export function getStoredStaffSession(): StaffAuthData | null {
  try {
    const raw = localStorage.getItem(STAFF_SESSION_KEY);
    return raw ? (JSON.parse(raw) as StaffAuthData) : null;
  } catch {
    return null;
  }
}

export function logoutGuest(): void {
  localStorage.removeItem(GUEST_SESSION_KEY);
}

export function logoutStaff(): void {
  localStorage.removeItem(STAFF_SESSION_KEY);
}

function mapDeptName(name: string): Department {
  const map: Record<string, Department> = {
    'Front Desk': 'Front Desk',
    Housekeeping: 'Housekeeping',
    Maintenance: 'Maintenance',
    'Food & Beverage': 'Food & Beverage',
    Concierge: 'Concierge',
    'Spa & Wellness': 'Spa & Wellness',
    'Pool & Recreation': 'Concierge',
    Management: 'Front Desk',
  };
  return map[name] ?? 'Front Desk';
}
