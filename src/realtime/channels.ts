// ============================================================
// Centralized channel name factory — single source of truth.
// All subscription keys are defined here so refactoring only
// requires changes in one place.
//
// Naming convention:  {scope}:{identifier}
// ============================================================

export const CHANNELS = {
  // ── Staff ────────────────────────────────────────────────
  /** All requests for a hotel (used by StaffDashboard, StaffRequests, Manager) */
  staffRequests: (hotelId: string) => `requests:${hotelId}`,

  /** Manager hotel-wide view (separate so it can be removed independently) */
  managerRequests: (hotelId: string) => `manager_realtime:${hotelId}`,

  /** Live room-board and housekeeping task updates */
  roomOperations: (hotelId: string) => `room_operations:${hotelId}`,

  /** Staff housekeeping work queue */
  housekeepingTasks: (staffId: string) => `housekeeping_tasks:${staffId}`,

  // ── Guest ────────────────────────────────────────────────
  /** Guest-scoped request updates — filtered to guestId at subscription level */
  guestRequests: (guestId: string) => `guest_requests:${guestId}`,

  // ── Request detail ───────────────────────────────────────
  /** Specific request and its events (used by StaffRequestDetail, GuestRequestDetail) */
  requestDetail: (requestId: string) => `request_detail:${requestId}`,

  // ── Conversation / Chat ──────────────────────────────────
  /** Messages within a single conversation */
  conversation: (conversationId: string) => `messages:${conversationId}`,

  // ── Connection heartbeat ─────────────────────────────────
  /** Minimal channel used only for connection-state tracking */
  heartbeat: () => `heartbeat:connection`,
} as const;

// ── Realtime debug logger ─────────────────────────────────────
// Set VITE_REALTIME_DEBUG=true in .env.local to enable verbose logs.
// Never logs passwords, tokens, or secrets.
const debugEnabled =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_REALTIME_DEBUG === 'true';

export function rtLog(channel: string, event: string, meta?: Record<string, unknown>): void {
  if (!debugEnabled) return;
  console.debug(`[RT] ${channel} › ${event}`, meta ?? '');
}
