import { supabase } from '@/lib/supabase';
import { getOrCreateConversation, addMessage, ensureWelcomeMessage, getMessages } from './guestService';
import { createRequest, type CreateRequestInput } from './requestService';
import { conciergeEngine, type ConciergeContext } from '@/ai';
import type { HotelRequest, Message, Conversation } from '@/types';
import type { MessageRow } from '@/types/database';

// ============================================================
// Conversation service — handles the concierge chat flow.
// Driven by the AI Concierge Engine in src/ai/.
// Persists messages and operational tickets to Supabase.
// ============================================================

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.sender_type === 'guest' ? 'guest' : 'assistant',
    content: row.content,
    timestamp: row.created_at,
    requestId: row.request_id ?? undefined,
  };
}

export interface ConversationResult {
  conversation: Conversation;
  assistantMessage: Message;
  request?: HotelRequest;
}

// In-memory message store for demo mode or when database is offline
let inMemoryMessages: Message[] = [
  {
    id: 'm-1',
    conversationId: 'conv-1',
    role: 'assistant',
    content: "Good day! I'm your digital concierge for your stay at DoubleTree by Hilton Malta. How may I assist you today?",
    timestamp: new Date().toISOString(),
  },
];

export async function loadConversation(
  guestId: string,
  stayId: string,
  guestName: string,
): Promise<Conversation | null> {
  const conv = await getOrCreateConversation(guestId, stayId);
  const convId = conv?.id ?? 'conv-1';

  await ensureWelcomeMessage(convId, guestName);
  const messages = await getMessages(convId);

  return {
    id: convId,
    guestId,
    title: 'Concierge conversation',
    messages: messages.map(rowToMessage),
    createdAt: messages[0]?.created_at ?? new Date().toISOString(),
    lastActivityAt: messages[messages.length - 1]?.created_at ?? new Date().toISOString(),
  };
}

export async function sendMessage(
  guestId: string,
  stayId: string,
  hotelId: string,
  roomId: string,
  guestName: string,
  roomNumber: string,
  content: string,
): Promise<ConversationResult | null> {
  const conv = await getOrCreateConversation(guestId, stayId);
  const convId = conv?.id ?? 'conv-1';

  const context: ConciergeContext = {
    guestId,
    stayId,
    hotelId,
    roomId,
    guestName,
    roomNumber,
    conversationId: convId,
  };

  // 1. Analyze message using active AI Concierge Engine (Gemini with fallback)
  const analysis = await conciergeEngine.analyzeAndRespond(content, context);

  // 2. Persist guest message
  await addMessage(convId, 'guest', content);

  // 3. Create operational request if action is required AND no critical information is missing
  let request: HotelRequest | undefined;
  const hasMissingInfo = Array.isArray(analysis.missingInformation) && analysis.missingInformation.length > 0;

  if (analysis.actionRequired && !hasMissingInfo && !analysis.isExistingRequestAction) {
    const title = analysis.title?.trim() || 'Guest Service Request';
    const description = analysis.description?.trim() || `Guest in ${roomNumber ? `Room ${roomNumber}` : 'room'} requests: "${content}".`;

    // Duplicate request protection: Check if an identical request was placed within last 90 seconds
    try {
      const { getGuestRequests } = await import('./requestService');
      const recent = await getGuestRequests(guestId);
      const duplicate = recent.find((r) => {
        if (r.title.toLowerCase() !== title.toLowerCase()) return false;
        const elapsed = Date.now() - new Date(r.createdAt).getTime();
        return elapsed < 90000; // 90 seconds
      });

      if (duplicate) {
        request = duplicate;
      } else {
        const input: CreateRequestInput = {
          hotelId,
          guestId,
          stayId,
          roomId,
          conversationId: convId,
          title,
          description,
          category: analysis.department ?? 'Concierge',
          priority: analysis.priority ?? 'Normal',
        };
        request = (await createRequest(input)) ?? undefined;
      }
    } catch {
      const input: CreateRequestInput = {
        hotelId,
        guestId,
        stayId,
        roomId,
        conversationId: convId,
        title,
        description,
        category: analysis.department ?? 'Concierge',
        priority: analysis.priority ?? 'Normal',
      };
      request = (await createRequest(input)) ?? undefined;
    }
  }

  // 4. Persist assistant message linked to the created request
  const assistantRow = await addMessage(convId, 'assistant', analysis.response, request?.id);
  if (!assistantRow) return null;

  // 5. Reload all messages in sequence
  const messages = await getMessages(convId);

  const conversation: Conversation = {
    id: convId,
    guestId,
    title: 'Concierge conversation',
    messages: messages.map(rowToMessage),
    createdAt: messages[0]?.created_at ?? new Date().toISOString(),
    lastActivityAt: messages[messages.length - 1]?.created_at ?? new Date().toISOString(),
  };

  return {
    conversation,
    assistantMessage: rowToMessage(assistantRow),
    request,
  };
}
