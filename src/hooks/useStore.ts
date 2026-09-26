import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { CHANNELS, rtLog } from '@/realtime/channels';
import { subscribeToRealtimeBroadcast } from '@/realtime/bus';
import { toast } from '@/hooks/useToast';
import type { HotelRequest, RequestEvent, RequestStatus, Conversation } from '@/types';
import {
  getAllRequests,
  getGuestRequests,
  getRequestById,
  getRequestEvents,
  updateRequestStatus as svcUpdateStatus,
  acceptRequest as svcAcceptRequest,
  startRequest as svcStartRequest,
  completeRequest as svcCompleteRequest,
  assignRequest as svcAssignRequest,
  escalateRequest as svcEscalate,
  cancelRequest as svcCancelRequest,
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

export interface IncomingRequestAlert {
  id: string;
  title: string;
  roomNumber?: string;
  priority?: string;
}

export function useStaffRequests(hotelId: string) {
  const [requests, setRequests] = useState<HotelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newIncomingAlert, setNewIncomingAlert] = useState<IncomingRequestAlert | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getAllRequests(hotelId);
      setRequests(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load requests.';
      setError(message);
      console.error(message, err);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  const debouncedRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refresh();
    }, 50);
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cross-tab broadcast listener (for demo mode / instant local sync)
  useEffect(() => {
    const unsub = subscribeToRealtimeBroadcast((ev) => {
      if (ev.type === 'request:created') {
        setNewIncomingAlert({
          id: ev.request.id,
          title: ev.request.title,
          priority: ev.request.priority,
        });
        toast.show({
          type: ev.request.priority === 'Urgent' ? 'alert' : 'info',
          title: `New Request: ${ev.request.title || 'Incoming'}`,
          message: `Priority: ${ev.request.priority || 'normal'} • Room ${ev.request.roomNumber || '408'}`,
        });
        debouncedRefresh();
      } else if (ev.type === 'request:updated' || ev.type === 'request:deleted' || ev.type === 'request_events:created') {
        debouncedRefresh();
      }
    });
    return unsub;
  }, [debouncedRefresh]);

  // Realtime: listen for request changes via Supabase
  useEffect(() => {
    if (!hotelId) return;
    const channelName = CHANNELS.staffRequests(hotelId);
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, (payload) => {
        const newRecord = payload.new as any;
        if (newRecord) {
          setNewIncomingAlert({
            id: newRecord.id,
            title: newRecord.title,
            priority: newRecord.priority,
          });
          toast.show({
            type: newRecord.priority === 'urgent' ? 'alert' : 'info',
            title: `New Request: ${newRecord.title || 'Incoming'}`,
            message: `Priority: ${newRecord.priority || 'normal'} • Check Operations Dashboard`,
          });
        }
        debouncedRefresh();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, () => {
        debouncedRefresh();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'requests' }, () => {
        debouncedRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_events' }, () => {
        debouncedRefresh();
      })
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [hotelId, debouncedRefresh]);

  const dismissAlert = useCallback(() => {
    setNewIncomingAlert(null);
  }, []);

  return { requests, loading, error, refresh, newIncomingAlert, dismissAlert };
}

export function useGuestRequests(guestId: string) {
  const [requests, setRequests] = useState<HotelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestsRef = useRef<HotelRequest[]>([]);
  requestsRef.current = requests;
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getGuestRequests(guestId);
      setRequests(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load your requests.';
      setError(message);
      console.error(message, err);
    } finally {
      setLoading(false);
    }
  }, [guestId]);

  const debouncedRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refresh();
    }, 50);
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cross-tab broadcast listener (for demo mode / instant local sync)
  useEffect(() => {
    const unsub = subscribeToRealtimeBroadcast((ev) => {
      if (ev.type === 'request:created') {
        debouncedRefresh();
      } else if (ev.type === 'request:updated') {
        const prev = requestsRef.current.find((r) => r.id === ev.request.id);
        if (prev && prev.status !== ev.request.status) {
          const toastType = ev.request.status === 'Completed' ? 'success'
            : ev.request.status === 'Escalated' ? 'warning'
            : 'info';
          toast.show({
            type: toastType,
            title: `Request Status: ${ev.request.status}`,
            message: `"${prev.title || ev.request.title || 'Your request'}" is now ${ev.request.status}.`,
          });
        }
        debouncedRefresh();
      }
    });
    return unsub;
  }, [debouncedRefresh]);

  // Realtime: listen for changes to this guest's requests
  useEffect(() => {
    if (!guestId) return;
    const channelName = CHANNELS.guestRequests(guestId);
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'requests',
        filter: `guest_id=eq.${guestId}`,
      }, (payload) => {
        const newRecord = payload.new as any;
        if (newRecord?.id) {
          const prev = requestsRef.current.find((r) => r.id === newRecord.id);
          if (prev && prev.status !== newRecord.status) {
            const toastType = newRecord.status === 'Completed' ? 'success'
              : newRecord.status === 'Escalated' ? 'warning'
              : 'info';
            toast.show({
              type: toastType,
              title: `Request Status: ${newRecord.status}`,
              message: `"${prev.title || newRecord.title || 'Your request'}" is now ${newRecord.status}.`,
            });
          }
        }
        debouncedRefresh();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'requests',
        filter: `guest_id=eq.${guestId}`,
      }, () => {
        debouncedRefresh();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'requests',
        filter: `guest_id=eq.${guestId}`,
      }, () => {
        debouncedRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_events' }, () => {
        debouncedRefresh();
      })
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [guestId, debouncedRefresh]);

  return { requests, loading, error, refresh };
}

export function useRequestDetail(requestId: string) {
  const [request, setRequest] = useState<HotelRequest | null>(null);
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [req, evts] = await Promise.all([
        getRequestById(requestId),
        getRequestEvents(requestId),
      ]);
      setRequest(req);
      setEvents(evts);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load request details.';
      setError(message);
      console.error(message, err);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  const debouncedRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refresh();
    }, 50);
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cross-tab broadcast listener
  useEffect(() => {
    const unsub = subscribeToRealtimeBroadcast((ev) => {
      if (ev.type === 'request:updated' && ev.request.id === requestId) {
        debouncedRefresh();
      } else if (ev.type === 'request_events:created' && ev.event.requestId === requestId) {
        debouncedRefresh();
      }
    });
    return unsub;
  }, [requestId, debouncedRefresh]);

  // Realtime: listen for changes to this request and its events
  useEffect(() => {
    if (!requestId) return;
    const channelName = CHANNELS.requestDetail(requestId);
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `id=eq.${requestId}` }, () => {
        debouncedRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_events', filter: `request_id=eq.${requestId}` }, () => {
        debouncedRefresh();
      })
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [requestId, debouncedRefresh]);

  return { request, events, loading, error, refresh, setRequest };
}

export function useStaffActions() {
  const { staffData } = useAuth();

  const accept = useCallback(
    async (requestId: string): Promise<boolean> => {
      if (!staffData) return false;
      return svcAcceptRequest(requestId, staffData.staffId, staffData.name);
    },
    [staffData],
  );

  const start = useCallback(
    async (requestId: string): Promise<boolean> => {
      if (!staffData) return false;
      return svcStartRequest(requestId, staffData.staffId, staffData.name);
    },
    [staffData],
  );

  const complete = useCallback(
    async (requestId: string): Promise<boolean> => {
      if (!staffData) return false;
      return svcCompleteRequest(requestId, staffData.staffId, staffData.name);
    },
    [staffData],
  );

  const assign = useCallback(
    async (requestId: string, targetStaffId: string, targetStaffName: string): Promise<boolean> => {
      if (!staffData) return false;
      return svcAssignRequest(requestId, targetStaffId, targetStaffName, staffData.name);
    },
    [staffData],
  );

  const escalate = useCallback(
    async (requestId: string, reason?: string): Promise<boolean> => {
      if (!staffData) return false;
      return svcEscalate(requestId, staffData.staffId, staffData.name, reason);
    },
    [staffData],
  );

  const cancel = useCallback(
    async (requestId: string, reason?: string): Promise<boolean> => {
      if (!staffData) return false;
      return svcCancelRequest(requestId, staffData.staffId, staffData.name, reason);
    },
    [staffData],
  );

  const updateStatus = useCallback(
    async (requestId: string, status: RequestStatus, note?: string): Promise<boolean> => {
      if (!staffData) return false;
      return svcUpdateStatus(requestId, status, staffData.staffId, staffData.name, note);
    },
    [staffData],
  );

  return {
    acceptRequest: accept,
    startRequest: start,
    completeRequest: complete,
    assignRequest: assign,
    escalateRequest: escalate,
    cancelRequest: cancel,
    updateStatus,
  };
}

// ============================================================
// Staff list hook — loads staff profiles for assign picker.
// ============================================================

import { getStaffByHotel, type StaffWithDepartment } from '@/services/staffService';

export function useStaffList(hotelId: string) {
  const [staffList, setStaffList] = useState<StaffWithDepartment[]>([]);

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
  const conversationRef = useRef<Conversation | null>(null);
  conversationRef.current = conversation;

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

  // Cross-tab broadcast listener for conversation
  useEffect(() => {
    const unsub = subscribeToRealtimeBroadcast(async (ev) => {
      if (ev.type === 'message:created' && guestData) {
        const conv = await loadConversation(guestData.guestId, guestData.stayId, guestData.name);
        setConversation(conv);
      }
    });
    return unsub;
  }, [guestData]);

  // Realtime: listen for new messages in this conversation
  useEffect(() => {
    if (!conversation?.id) return;
    const channelName = CHANNELS.conversation(conversation.id);
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, async (payload) => {
        const newRecord = payload.new as any;
        if (!guestData) return;

        // Deduplication: if message ID already exists in local conversation state, skip reloading
        const current = conversationRef.current;
        if (current && newRecord?.id && current.messages.some((m) => m.id === newRecord.id)) {
          rtLog(channelName, 'skip duplicate message', { id: newRecord.id });
          return;
        }

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
        guestData.roomId,
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

// ============================================================
// Stay hook — loads the active stay for the logged-in guest.
// Used by GuestDashboard to show real checkout dates and
// guest counts instead of hardcoded placeholder values.
// ============================================================

import { getGuestWithStay } from '@/services/guestService';

export interface GuestStayInfo {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomType: string;
}

export function useGuestStay(guestId: string) {
  const [stay, setStay] = useState<GuestStayInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guestId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const data = await getGuestWithStay(guestId);
      if (!cancelled) {
        if (data?.stay && data?.room) {
          setStay({
            checkIn: data.stay.check_in,
            checkOut: data.stay.check_out,
            adults: data.stay.adults,
            children: data.stay.children,
            roomType: data.room.room_type,
          });
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [guestId]);

  return { stay, loading };
}
