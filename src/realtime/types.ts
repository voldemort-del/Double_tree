// ============================================================
// Shared types for the realtime layer.
// Kept minimal — only add here when multiple modules need it.
// ============================================================

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/** Subset of the raw Supabase RealtimePostgresChangesPayload used across hooks */
export interface ChangePayload<T extends Record<string, unknown> = Record<string, unknown>> {
  eventType: RealtimeEventType;
  new: Partial<T>;
  old: Partial<T>;
  table: string;
  schema: string;
}

/** Application-level WebSocket connection status */
export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';
