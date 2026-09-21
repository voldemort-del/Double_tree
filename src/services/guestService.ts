import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { GuestRow, StayRow, RoomRow, ConversationRow, MessageRow } from '@/types/database';

// ============================================================
// Guest service — fetches guest-related data from Supabase.
// ============================================================

export async function getGuestWithStay(guestId: string) {
  if (isSupabaseConfigured) {
    try {
      const { data: guest, error: gError } = await supabase
        .from('guests')
        .select('id, first_name, last_name, username, hotel_id')
        .eq('id', guestId)
        .maybeSingle();

      if (!gError && guest) {
        const { data: stay } = await supabase
          .from('stays')
          .select('id, guest_id, room_id, check_in, check_out, status, adults, children')
          .eq('guest_id', guestId)
          .eq('status', 'active')
          .maybeSingle();

        let room: RoomRow | null = null;
        if (stay) {
          const { data: r } = await supabase
            .from('rooms')
            .select('id, hotel_id, room_number, room_type, floor, status')
            .eq('id', stay.room_id)
            .maybeSingle();
          room = r as RoomRow | null;
        }

        return { guest, stay, room };
      }
    } catch (err) {
      console.warn('getGuestWithStay error, using demo fallback:', err);
    }
  }

  // Demo fallback
  return {
    guest: {
      id: 'g-1',
      first_name: 'Alex',
      last_name: 'Morgan',
      username: 'guest',
      hotel_id: 'h-1',
    } as unknown as GuestRow,
    stay: {
      id: 's-1',
      guest_id: 'g-1',
      room_id: 'r-408',
      check_in: new Date(Date.now() - 3 * 86400000).toISOString(),
      check_out: new Date(Date.now() + 4 * 86400000).toISOString(),
      status: 'active',
      adults: 2,
      children: 0,
    } as unknown as StayRow,
    room: {
      id: 'r-408',
      hotel_id: 'h-1',
      room_number: '408',
      room_type: 'Sea View King',
      floor: 4,
      status: 'occupied',
    } as unknown as RoomRow,
  };
}

const DEMO_CONV_KEY = 'dth_demo_conversation_messages';

function getLocalMessages(): MessageRow[] {
  try {
    const raw = localStorage.getItem(DEMO_CONV_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalMessages(msgs: MessageRow[]): void {
  try {
    localStorage.setItem(DEMO_CONV_KEY, JSON.stringify(msgs));
  } catch {}
}

export async function getOrCreateConversation(
  guestId: string,
  stayId: string,
): Promise<{ id: string } | null> {
  if (isSupabaseConfigured) {
    try {
      // Try to find existing active conversation
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('id, guest_id, stay_id, title, status, created_at, updated_at')
        .eq('guest_id', guestId)
        .eq('status', 'active')
        .maybeSingle();

      if (!findError && existing) return { id: existing.id };

      // Create new
      const { data: conv, error } = await supabase
        .from('conversations')
        .insert({
          guest_id: guestId,
          stay_id: stayId,
          title: 'Concierge conversation',
          status: 'active',
        })
        .select('id')
        .maybeSingle();

      if (!error && conv) return { id: conv.id };
    } catch (err) {
      console.warn('getOrCreateConversation error, using demo fallback:', err);
    }
  }

  // Demo fallback
  return { id: 'conv-1' };
}

export async function getMessages(conversationId: string): Promise<MessageRow[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_type, sender_id, content, request_id, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && data) return data;
    } catch (err) {
      console.warn('getMessages error, using demo fallback:', err);
    }
  }

  return getLocalMessages();
}

export async function addMessage(
  conversationId: string,
  senderType: 'guest' | 'assistant' | 'staff',
  content: string,
  requestId?: string,
): Promise<MessageRow | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: senderType,
          content,
          request_id: requestId ?? null,
        })
        .select('id, conversation_id, sender_type, sender_id, content, request_id, created_at')
        .maybeSingle();

      if (!error && data) return data;
    } catch (err) {
      console.warn('addMessage error, falling back to demo storage:', err);
    }
  }

  // Demo fallback: save to localStorage
  const newMsg: MessageRow = {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    conversation_id: conversationId,
    sender_type: senderType,
    sender_id: null,
    content,
    request_id: requestId ?? null,
    created_at: new Date().toISOString(),
  };
  const list = getLocalMessages();
  list.push(newMsg);
  saveLocalMessages(list);
  return newMsg;
}

export async function ensureWelcomeMessage(conversationId: string, guestName: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);

      if (!error && count === 0) {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        await addMessage(
          conversationId,
          'assistant',
          `Good ${greeting}, ${guestName.split(' ')[0]}. I'm your digital concierge for your stay at DoubleTree by Hilton Malta. How can I help you?`,
        );
      }
      return;
    } catch (err) {
      console.warn('ensureWelcomeMessage error, using demo fallback:', err);
    }
  }

  // Demo fallback
  const list = getLocalMessages();
  if (list.length === 0) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    await addMessage(
      conversationId,
      'assistant',
      `Good ${greeting}, ${guestName.split(' ')[0]}. I'm your digital concierge for your stay at DoubleTree by Hilton Malta. How can I help you?`,
    );
  }
}
