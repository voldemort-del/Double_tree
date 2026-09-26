import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Department } from '@/types';

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
  housekeepingEligible: boolean;
  maintenanceEligible: boolean;
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
      await ensureAuthenticatedIdentity();
      const { data, error } = await supabase.rpc('login_guest', {
        p_username: username.trim(),
        p_room_number: roomNumber.trim(),
        p_pin: pin.trim(),
      });
      if (error) throw error;
      if (data) {
        const authData = data as GuestAuthData;
        getSessionStorage().setItem(GUEST_SESSION_KEY, JSON.stringify(authData));
        getSessionStorage().removeItem(STAFF_SESSION_KEY);
        return authData;
      }
    } catch (err) {
      console.error('Supabase guest authentication failed:', err);
      return null;
    }
    return null;
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
      await ensureAuthenticatedIdentity();
      const { data, error } = await supabase.rpc('login_staff', {
        p_username: cleanUsername,
        p_password: cleanPassword,
      });
      if (error) throw error;
      if (data) {
        const authData = data as StaffAuthData;
        getSessionStorage().setItem(STAFF_SESSION_KEY, JSON.stringify(authData));
        getSessionStorage().removeItem(GUEST_SESSION_KEY);
        return authData;
      }
    } catch (err) {
      console.error('Supabase staff authentication failed:', err);
      return null;
    }
    return null;
  }

  // Demo fallback
  const fallbackMap: Record<string, { id: string; name: string; dept: Department; role: 'staff' | 'manager' }> = {
    staff:   { id: 'st-1', name: 'Maria Vella',     dept: 'Food & Beverage', role: 'staff' },
    staff2:  { id: 'st-2', name: 'Daniel Zahra',    dept: 'Food & Beverage', role: 'staff' },
    staff3:  { id: 'st-3', name: 'Lucia Grech',     dept: 'Food & Beverage', role: 'staff' },
    staff4:  { id: 'st-4', name: 'Marco Bonnici',   dept: 'Food & Beverage', role: 'staff' },
    staff5:  { id: 'st-5', name: 'Elena Borg',      dept: 'Food & Beverage', role: 'staff' },
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
      housekeepingEligible: cleanUsername === 'staff',
      maintenanceEligible: cleanUsername === 'staff2',
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
    if (!raw) return null;
    const session = JSON.parse(raw) as StaffAuthData;
    session.housekeepingEligible ??= session.department === 'Housekeeping';
    return session;
  } catch {
    return null;
  }
}

export function logoutGuest(): void {
  getSessionStorage().removeItem(GUEST_SESSION_KEY);
  if (isSupabaseConfigured) void supabase.auth.signOut();
}

export function logoutStaff(): void {
  getSessionStorage().removeItem(STAFF_SESSION_KEY);
  if (isSupabaseConfigured) void supabase.auth.signOut();
}

export async function ensureAuthenticatedIdentity(): Promise<void> {
  const { data: current, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (current.session) return;

  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}
