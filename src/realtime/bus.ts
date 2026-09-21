import type { HotelRequest, RequestEvent, Message } from '@/types';

// ============================================================
// Cross-tab / Cross-window Realtime Event Bus
//
// Enables instant real-time synchronization between Guest,
// Staff, and Manager windows even when running in prototype/demo
// mode (no live Supabase connection) or as an instant local layer.
//
// Uses the browser's BroadcastChannel API, with automatic fallback
// to storage events for environments without BroadcastChannel.
// ============================================================

export type RealtimeBroadcastEvent =
  | { type: 'request:created'; request: HotelRequest }
  | { type: 'request:updated'; request: HotelRequest }
  | { type: 'request:deleted'; id: string }
  | { type: 'request_events:created'; event: RequestEvent }
  | { type: 'message:created'; message: Message };

type Listener = (event: RealtimeBroadcastEvent) => void;

const CHANNEL_NAME = 'dth_operations_realtime';
const STORAGE_PING_KEY = 'dth_realtime_event_ping';

let channel: BroadcastChannel | null = null;
const listeners = new Set<Listener>();

// Initialize BroadcastChannel if available
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (ev) => {
      if (ev.data && typeof ev.data.type === 'string') {
        notifyListeners(ev.data as RealtimeBroadcastEvent);
      }
    };
  } catch (err) {
    console.warn('BroadcastChannel failed to initialize, using storage fallback:', err);
    channel = null;
  }
}

// Fallback: listen for localStorage storage events across tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (ev) => {
    if (ev.key === STORAGE_PING_KEY && ev.newValue) {
      try {
        const payload = JSON.parse(ev.newValue) as RealtimeBroadcastEvent;
        notifyListeners(payload);
      } catch {
        // ignore parse error
      }
    }
  });
}

function notifyListeners(event: RealtimeBroadcastEvent) {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch (err) {
      console.error('Error in realtime broadcast listener:', err);
    }
  });
}

/**
 * Emit a realtime event to all listening tabs / components.
 */
export function emitRealtimeEvent(event: RealtimeBroadcastEvent): void {
  // 1. Notify listeners in the current window immediately
  notifyListeners(event);

  // 2. Broadcast to other windows via BroadcastChannel
  if (channel) {
    try {
      channel.postMessage(event);
    } catch (err) {
      console.warn('BroadcastChannel postMessage failed:', err);
    }
  }

  // 3. Update localStorage to notify other windows via storage event
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Add random suffix to ensure value always changes and fires event
      const payloadStr = JSON.stringify({ ...event, _t: Date.now() });
      localStorage.setItem(STORAGE_PING_KEY, payloadStr);
    } catch {
      // storage full or unavailable
    }
  }
}

/**
 * Subscribe to realtime broadcast events across any tab.
 * Returns an unsubscribe function.
 */
export function subscribeToRealtimeBroadcast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
