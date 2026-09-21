import { supabase } from '@/lib/supabase';
import type { GuestRow, StayRow, RoomRow, ConversationRow, MessageRow } from '@/types/database';

// ============================================================
// Guest service — fetches guest-related data from Supabase.
// ============================================================

export async function getGuestWithStay(guestId: string) {
  const { data: guest, error: gError } = await supabase
    .from('guests')
    .select('id, first_name, last_name, username, hotel_id')
    .eq('id', guestId)
    .maybeSingle();
  if (gError || !guest) return null;

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

export async function getOrCreateConversation(
  guestId: string,
  stayId: string,
): Promise<{ id: string } | null> {
  // Try to find existing active conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('id, guest_id, stay_id, title, status, created_at, updated_at')
    .eq('guest_id', guestId)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) return { id: existing.id };

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

  if (error || !conv) return null;
  return { id: conv.id };
}

export async function getMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_type, sender_id, content, request_id, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function addMessage(
  conversationId: string,
  senderType: 'guest' | 'assistant' | 'staff',
  content: string,
  requestId?: string,
): Promise<MessageRow | null> {
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

  if (error) return null;
  return data;
}

export async function ensureWelcomeMessage(conversationId: string, guestName: string): Promise<void> {
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);

  if (count === 0) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    await addMessage(
      conversationId,
      'assistant',
      `Good ${greeting}, ${guestName.split(' ')[0]}. I'm your digital concierge for your stay at DoubleTree by Hilton Malta. How can I help you?`,
    );
  }
}
