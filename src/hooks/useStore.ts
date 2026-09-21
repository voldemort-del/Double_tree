import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { HotelRequest, RequestEvent, RequestStatus, Conversation } from '@/types';
import {
  getAllRequests,
  getGuestRequests,
  getRequestById,
  getRequestEvents,
  updateRequestStatus as svcUpdateStatus,
  assignRequest as svcAssignRequest,
  escalateRequest as svcEscalate,
} from '@/services/requestService';
import {
  loadConversation,
  sendMessage as svcSendMessage,
} from '@/services/conversationService';
import { useAuth } from './useAuth';

// ============================================================
// Central data store backed by Supabase with realtime updates.
// Components use these hooks to fetch and mutate requests,
// conversations, and timeline events.
// ============================================================

export function useStaffRequests(hotelId: string) {
  const [requests, setRequests] = useState<HotelRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await getAllRequests(hotelId);
    setRequests(data);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: listen for request changes
  useEffect(() => {
    if (!hotelId) return;
    const channel = supabase
      .channel(`requests:${hotelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_events' }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotelId, refresh]);

  return { requests, loading, refresh };
}

export function useGuestRequests(guestId: string) {
  const [requests, setRequests] = useState<HotelRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await getGuestRequests(guestId);
    setRequests(data);
    setLoading(false);
  }, [guestId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: listen for changes to this guest's requests
  useEffect(() => {
    if (!guestId) return;
    const channel = supabase
      .channel(`guest_requests:${guestId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `guest_id=eq.${guestId}` }, () => {
        refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_events' }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [guestId, refresh]);

  return { requests, loading, refresh };
}

export function useRequestDetail(requestId: string) {
  const [request, setRequest] = useState<HotelRequest | null>(null);
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [req, evts] = await Promise.all([
      getRequestById(requestId),
      getRequestEvents(requestId),
    ]);
    setRequest(req);
    setEvents(evts);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: listen for changes to this request and its events
  useEffect(() => {
    if (!requestId) return;
    const channel = supabase
      .channel(`request_detail:${requestId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `id=eq.${requestId}` }, () => {
        refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_events', filter: `request_id=eq.${requestId}` }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, refresh]);

  return { request, events, loading, refresh };
}

export function useStaffActions() {
  const { staffData } = useAuth();

  const updateStatus = useCallback(
    async (requestId: string, status: RequestStatus) => {
      if (!staffData) return;
      await svcUpdateStatus(requestId, status, staffData.staffId, staffData.name);
    },
    [staffData],
  );

  const assignRequest = useCallback(
    async (requestId: string, staffId: string, staffName: string) => {
      await svcAssignRequest(requestId, staffId, staffName);
    },
    [],
  );

  const escalateRequest = useCallback(
    async (requestId: string) => {
      if (!staffData) return;
      await svcEscalate(requestId, staffData.staffId, staffData.name);
    },
    [staffData],
  );

  return { updateStatus, assignRequest, escalateRequest };
}

// ============================================================
// Staff list hook — loads staff profiles for assign picker.
// ============================================================

import { getStaffByHotel } from '@/services/staffService';
import type { StaffProfileRow } from '@/types/database';

export function useStaffList(hotelId: string) {
  const [staffList, setStaffList] = useState<StaffProfileRow[]>([]);

  useEffect(() => {
    if (!hotelId) return;
    let cancelled = false;
    (async () => {
      const data = await getStaffByHotel(hotelId);
      if (!cancelled) setStaffList(data);
    })();
    return () => { cancelled = true; };
  }, [hotelId]);

  return staffList;
}

// ============================================================
// Conversation hook — loads messages from Supabase and
// sends new messages through the conversation service.
// ============================================================

export function useConversation() {
  const { guestData } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load conversation on mount
  useEffect(() => {
    if (!guestData) return;
    let cancelled = false;

    (async () => {
      const conv = await loadConversation(guestData.guestId, guestData.stayId, guestData.name);
      if (!cancelled) {
        setConversation(conv);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [guestData]);

  // Realtime: listen for new messages in this conversation
  useEffect(() => {
    if (!conversation) return;
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` }, async () => {
        // Reload conversation messages
        if (!guestData) return;
        const conv = await loadConversation(guestData.guestId, guestData.stayId, guestData.name);
        setConversation(conv);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, guestData]);

  const send = useCallback(
    async (content: string) => {
      if (!guestData) return null;
      setSending(true);
      const result = await svcSendMessage(
        guestData.guestId,
        guestData.stayId,
        guestData.hotelId,
        '', // roomId not needed in auth data; conversation service gets it from stay
        guestData.name,
        guestData.roomNumber,
        content,
      );
      if (result) {
        setConversation(result.conversation);
      }
      setSending(false);
      return result;
    },
    [guestData],
  );

  return { conversation, loading, sending, send };
}
