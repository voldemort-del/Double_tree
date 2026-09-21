import type { Guest, Staff, Session } from '@/types';
import { findGuest, findStaff } from '@/data/mockData';

// ============================================================
// Mock authentication service.
// Swap with Supabase auth later — interface stays the same.
// ============================================================

const STORAGE_KEY = 'dth_session';

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const mockAuthService = {
  async loginGuest(username: string, roomNumber: string, pin: string): Promise<Session> {
    const guest: Guest | undefined = findGuest(username, roomNumber, pin);
    if (!guest) return delay(null);
    const session: Session = {
      type: 'guest',
      guestId: guest.id,
      name: guest.name,
      roomNumber: guest.roomNumber,
    };
    persist(session);
    return delay(session);
  },

  async loginStaff(username: string, password: string): Promise<Session> {
    const member: Staff | undefined = findStaff(username, password);
    if (!member) return delay(null);
    const session: Session = {
      type: member.role,
      staffId: member.id,
      name: member.name,
      role: member.role,
      department: member.department,
    };
    persist(session);
    return delay(session);
  },

  getSession(): Session {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};

function persist(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
