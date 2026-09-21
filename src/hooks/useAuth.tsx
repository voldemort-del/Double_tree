import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Session, Department } from '@/types';
import {
  loginGuest as svcLoginGuest,
  loginStaff as svcLoginStaff,
  getStoredGuestSession,
  getStoredStaffSession,
  logoutGuest,
  logoutStaff,
  type GuestAuthData,
  type StaffAuthData,
} from '@/services/authService';

interface AuthContextValue {
  session: Session;
  loading: boolean;
  guestData: GuestAuthData | null;
  staffData: StaffAuthData | null;
  loginGuest: (username: string, roomNumber: string, pin: string) => Promise<boolean>;
  loginStaff: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [guestData, setGuestData] = useState<GuestAuthData | null>(null);
  const [staffData, setStaffData] = useState<StaffAuthData | null>(null);
  const [loading, setLoading] = useState(true);

  const syncSessionFromStorage = useCallback(() => {
    const guest = getStoredGuestSession();
    const staff = getStoredStaffSession();
    setGuestData(guest);
    setStaffData(staff);

    const loc = (window.location.hash || window.location.pathname).toLowerCase();
    const isStaffRoute = loc.includes('staff');

    if (isStaffRoute) {
      if (staff) {
        setSession({ type: staff.role, staffId: staff.staffId, name: staff.name, role: staff.role, department: staff.department });
      } else {
        setSession(null);
      }
    } else {
      if (guest) {
        setSession({ type: 'guest', guestId: guest.guestId, name: guest.name, roomNumber: guest.roomNumber });
      } else {
        setSession(null);
      }
    }
  }, []);

  useEffect(() => {
    syncSessionFromStorage();
    setLoading(false);

    const handler = () => syncSessionFromStorage();
    window.addEventListener('hashchange', handler);
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('hashchange', handler);
      window.removeEventListener('popstate', handler);
    };
  }, [syncSessionFromStorage]);

  const loginGuest = useCallback(async (username: string, roomNumber: string, pin: string) => {
    setLoading(true);
    const data = await svcLoginGuest(username, roomNumber, pin);
    setLoading(false);
    if (data) {
      setGuestData(data);
      setSession({ type: 'guest', guestId: data.guestId, name: data.name, roomNumber: data.roomNumber });
      return true;
    }
    return false;
  }, []);

  const loginStaff = useCallback(async (username: string, password: string) => {
    setLoading(true);
    const data = await svcLoginStaff(username, password);
    setLoading(false);
    if (data) {
      setStaffData(data);
      setSession({ type: data.role, staffId: data.staffId, name: data.name, role: data.role, department: data.department });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    const loc = (window.location.hash || window.location.pathname).toLowerCase();
    if (loc.includes('staff')) {
      logoutStaff();
      setStaffData(null);
      setSession(null);
    } else {
      logoutGuest();
      setGuestData(null);
      setSession(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, guestData, staffData, loginGuest, loginStaff, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
