import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CHANNELS, rtLog } from '@/realtime/channels';
import type { ConnectionStatus } from '@/realtime/types';

// ============================================================
// useConnectionState — tracks the WebSocket connection to
// Supabase Realtime. Uses a dedicated lightweight heartbeat
// channel so status is independent of any data subscription.
//
// Returns: 'connected' | 'reconnecting' | 'offline'
//
// • Shows 'connected' immediately for demo mode (no Supabase).
// • Reflects browser offline events instantly.
// • When the connection recovers, downstream hooks refetch
//   via their own subscription restart logic.
// ============================================================

export function useConnectionState(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(() => {
    if (!isSupabaseConfigured) return 'connected';
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
    return 'connected'; // optimistic — channel will correct if wrong
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Demo mode — always show as connected
    if (!isSupabaseConfigured) {
      setStatus('connected');
      return;
    }

    // ── Supabase heartbeat channel ──
    const ch = supabase.channel(CHANNELS.heartbeat()).subscribe((s) => {
      rtLog(CHANNELS.heartbeat(), 'status', { s });
      switch (s) {
        case 'SUBSCRIBED':
          setStatus('connected');
          break;
        case 'TIMED_OUT':
        case 'CHANNEL_ERROR':
          setStatus('reconnecting');
          break;
        case 'CLOSED':
          setStatus('offline');
          break;
      }
    });

    channelRef.current = ch;

    // ── Browser online / offline ──
    const handleOnline = () => {
      rtLog('browser', 'online');
      // Channel will re-subscribe; status will become 'connected' via callback
      setStatus('reconnecting');
    };
    const handleOffline = () => {
      rtLog('browser', 'offline');
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
