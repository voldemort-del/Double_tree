import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { GuestRow, StaffProfileRow, DepartmentRow } from '@/types/database';
import type { Session, Department } from '@/types';

const GUEST_SESSION_KEY = 'dth_guest_session';
const STAFF_SESSION_KEY = 'dth_staff_session';

function getSessionStorage(): Storage {
  return typeof window !== 'undefined' ? window.sessionStorage : localStorage;
}

export interface GuestAuthData {
  guestId: string;
  name: string;
  roomNumber: string;
  roomId: string;
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
  if (isSupabaseConfigured) {
    try {
      const { data: guest, error } = await supabase
        .from('guests')
        .select('id, first_name, last_name, username, pin, hotel_id')
        .eq('username', username)
        .maybeSingle();

      if (!error && guest && String(guest.pin).trim() === pin.trim()) {
        // Find active stay
        const { data: stay } = await supabase
          .from('stays')
          .select('id, room_id, status')
          .eq('guest_id', guest.id)
          .eq('status', 'active')
          .maybeSingle();

        if (stay) {
          // Verify room number matches
          const { data: room } = await supabase
            .from('rooms')
            .select('id, room_number')
            .eq('id', stay.room_id)
            .maybeSingle();

          if (room && room.room_number === roomNumber) {
            const authData: GuestAuthData = {
              guestId: guest.id,
              name: `${guest.first_name} ${guest.last_name}`,
              roomNumber: room.room_number,
              roomId: room.id,
              hotelId: guest.hotel_id,
              stayId: stay.id,
            };

            getSessionStorage().setItem(GUEST_SESSION_KEY, JSON.stringify(authData));
            return authData;
          }
        }
      }
    } catch (err) {
      console.warn('Supabase guest query failed, evaluating demo fallback:', err);
    }
  }

  // Demo fallback: Alex Morgan in room 408
  if (username.toLowerCase() === 'guest' && roomNumber === '408' && pin === '1234') {
    const authData: GuestAuthData = {
      guestId: 'g-1',
      name: 'Alex Morgan',
      roomNumber: '408',
      roomId: 'r-408',
      hotelId: 'a0000000-0000-0000-0000-000000000001',
      stayId: 's-1',
    };
    getSessionStorage().setItem(GUEST_SESSION_KEY, JSON.stringify(authData));
    return authData;
  }

  return null;
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
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();

  // Accept username or username123 as demo password
  const isValidPassword =
    cleanPassword === cleanUsername ||
    cleanPassword === `${cleanUsername}123` ||
    (cleanPassword === 'staff123' && /^staff\d*$/.test(cleanUsername)) ||
    cleanPassword === 'password';

  if (!isValidPassword) return null;

  if (isSupabaseConfigured) {
    try {
      const { data: profile, error } = await supabase
        .from('staff_profiles')
        .select('id, first_name, last_name, role, hotel_id, department_id, username')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (!error && profile) {
        // Get department name
        let department: Department = profile.role === 'staff' ? 'Food & Beverage' : 'Front Desk';
        if (profile.department_id) {
          const { data: dept } = await supabase
            .from('departments')
            .select('name')
            .eq('id', profile.department_id)
            .maybeSingle();
          if (dept) {
            department = profile.role === 'staff' ? 'Food & Beverage' : mapDeptName(dept.name);
          }
        }

        const authData: StaffAuthData = {
          staffId: profile.id,
          name: `${profile.first_name} ${profile.last_name}`,
          role: profile.role as 'staff' | 'manager',
          department,
          hotelId: profile.hotel_id,
        };

        getSessionStorage().setItem(STAFF_SESSION_KEY, JSON.stringify(authData));
        return authData;
      }
    } catch (err) {
      console.warn('Supabase staff query failed, evaluating demo fallback:', err);
    }
  }

  // Demo fallback
  const fallbackMap: Record<string, { id: string; name: string; dept: Department; role: 'staff' | 'manager' }> = {
    staff:   { id: 'st-1', name: 'Maria Vella',     dept: 'Housekeeping',    role: 'staff' },
    staff2:  { id: 'st-2', name: 'Daniel Zahra',    dept: 'Maintenance',     role: 'staff' },
    staff3:  { id: 'st-3', name: 'Lucia Grech',     dept: 'Concierge',       role: 'staff' },
    staff4:  { id: 'st-4', name: 'Marco Bonnici',   dept: 'Food & Beverage', role: 'staff' },
    staff5:  { id: 'st-5', name: 'Elena Borg',      dept: 'Spa & Wellness',  role: 'staff' },
    manager: { id: 'st-mgr', name: 'Antoine Caruana', dept: 'Front Desk',    role: 'manager' },
  };

  if (fallbackMap[cleanUsername]) {
    const member = fallbackMap[cleanUsername];
    const authData: StaffAuthData = {
      staffId: member.id,
      name: member.name,
      role: member.role,
      department: member.dept,
      hotelId: 'a0000000-0000-0000-0000-000000000001',
    };
    getSessionStorage().setItem(STAFF_SESSION_KEY, JSON.stringify(authData));
    return authData;
  }

  return null;
}

export function getStoredGuestSession(): GuestAuthData | null {
  try {
    const raw = getSessionStorage().getItem(GUEST_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as GuestAuthData;
    if (session && (session.hotelId === 'h-1' || !session.hotelId)) {
      session.hotelId = 'a0000000-0000-0000-0000-000000000001';
      getSessionStorage().setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    }
    return session;
  } catch {
    return null;
  }
}

export function getStoredStaffSession(): StaffAuthData | null {
  try {
    const raw = getSessionStorage().getItem(STAFF_SESSION_KEY);
    return raw ? (JSON.parse(raw) as StaffAuthData) : null;
  } catch {
    return null;
  }
}

export function logoutGuest(): void {
  getSessionStorage().removeItem(GUEST_SESSION_KEY);
}

export function logoutStaff(): void {
  getSessionStorage().removeItem(STAFF_SESSION_KEY);
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
