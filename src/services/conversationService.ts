import { supabase } from '@/lib/supabase';
import { getOrCreateConversation, addMessage, ensureWelcomeMessage, getMessages } from './guestService';
import { createRequest, type CreateRequestInput } from './requestService';
import type { HotelRequest, RequestPriority, Message, Conversation } from '@/types';
import type { MessageRow } from '@/types/database';

// ============================================================
// Conversation service — handles the concierge chat flow.
// Keeps the existing mock AI intent parsing for now, but
// persists messages and created requests to Supabase.
// ============================================================

interface ParsedIntent {
  actionable: boolean;
  category: string;
  priority: RequestPriority;
  title: string;
  description: string;
  reply: string;
}

function parseIntent(message: string, guestName: string, roomNumber: string): ParsedIntent {
  const msg = message.toLowerCase();

  // Informational questions — not actionable
  if (/^(what|when|where|how|is|are|do|does|can you tell|tell me)/.test(msg) && !/(fix|repair|broken|send|bring|order|book|arrange|need|want|request)/.test(msg)) {
    if (/breakfast/.test(msg)) {
      return {
        actionable: false, category: 'Information', priority: 'Normal', title: '', description: '',
        reply: 'Breakfast is served at Azure Restaurant & Terrace from 7:00 AM to 10:30 AM. Our breakfast includes a Mediterranean buffet, live cooking stations, and freshly baked pastries.',
      };
    }
    if (/pool|swim/.test(msg)) {
      return {
        actionable: false, category: 'Information', priority: 'Normal', title: '', description: '',
        reply: 'We have three outdoor swimming pools and one indoor heated pool. The main pool is open from 7:00 AM to 8:00 PM. Pool towels are available at the pool deck.',
      };
    }
    if (/spa|massage|treatment/.test(msg)) {
      return {
        actionable: false, category: 'Information', priority: 'Normal', title: '', description: '',
        reply: 'Myoka Spa offers a range of treatments including massages, facials, and body therapies. It is open daily from 9:00 AM to 8:00 PM. Would you like me to book a treatment for you?',
      };
    }
    if (/wifi|internet/.test(msg)) {
      return {
        actionable: false, category: 'Information', priority: 'Normal', title: '', description: '',
        reply: 'Complimentary Wi-Fi is available throughout the hotel. Connect to the network "DoubleTree Guest" using the password malta2024.',
      };
    }
    if (/checkout|check out/.test(msg)) {
      return {
        actionable: false, category: 'Information', priority: 'Normal', title: '', description: '',
        reply: 'Standard checkout time is 12:00 PM. Late checkout can be arranged subject to availability — just let me know and I will pass the request to our Front Desk.',
      };
    }
    return {
      actionable: false, category: 'Information', priority: 'Normal', title: '', description: '',
      reply: "I can help with that. Let me know if you would like me to arrange something for you — such as housekeeping, room service, maintenance, or a spa booking.",
    };
  }

  // Actionable requests
  if (/towel|pillow|sheet|blanket|toilet|extra|housekeep|clean/.test(msg)) {
    const isHigh = /urgent|immediately|asap/.test(msg);
    const item = msg.includes('towel') ? 'towels' : msg.includes('pillow') ? 'pillows' : msg.includes('sheet') ? 'sheets' : msg.includes('blanket') ? 'blankets' : 'housekeeping items';
    return {
      actionable: true, category: 'Housekeeping', priority: isHigh ? 'High' : 'Normal',
      title: `Extra ${item}`, description: `Guest requested ${message}`,
      reply: `Of course. I've sent a housekeeping request for ${message.toLowerCase()} to Room ${roomNumber}.`,
    };
  }

  if (/ac|air con|aircon|air conditioning|heating|cold|hot|broken|not working|repair|fix|maintenance|leak|noise|light|tv|television|plug|socket|door|lock/.test(msg)) {
    const isUrgent = /not working|broken|flood|leak|no power|urgent|asap/.test(msg);
    return {
      actionable: true, category: 'Maintenance', priority: isUrgent ? 'High' : 'Normal',
      title: message.length > 40 ? message.slice(0, 40) + '…' : message,
      description: `Guest reports: ${message}`,
      reply: isUrgent
        ? `I'm sorry about that. I've created a maintenance request for Room ${roomNumber} and marked it as high priority. Our maintenance team will be there shortly.`
        : `I've created a maintenance request for Room ${roomNumber}. Our team will look into this right away.`,
    };
  }

  if (/room service|food|order|eat|dinner|lunch|breakfast in room|menu|wine|drink|coffee|tea|sandwich|pasta|pizza|salad|dessert/.test(msg)) {
    return {
      actionable: true, category: 'Room Service', priority: 'Normal',
      title: message.length > 45 ? message.slice(0, 45) + '…' : message,
      description: `Room service order: ${message}`,
      reply: `Certainly. I've placed a room service order for Room ${roomNumber}. Our Food & Beverage team will prepare this for you.`,
    };
  }

  if (/spa|massage|treatment|facial|wellness|sauna/.test(msg)) {
    return {
      actionable: true, category: 'Spa & Wellness', priority: 'Normal',
      title: 'Spa treatment request', description: `Guest requested: ${message}`,
      reply: `Certainly. I can help you request a spa booking through Myoka Spa. I've sent your request to our Spa & Wellness team, who will confirm availability with you shortly.`,
    };
  }

  if (/taxi|transport|car|airport|shuttle|bus|drive|pick up|pickup|valletta|mdina|sliema/.test(msg)) {
    return {
      actionable: true, category: 'Transportation', priority: 'Normal',
      title: message.length > 40 ? message.slice(0, 40) + '…' : message,
      description: `Transportation request: ${message}`,
      reply: `Certainly. I've sent this to our concierge team to arrange transportation for you. If you have a specific destination, please share it and I'll add it to the request.`,
    };
  }

  if (/late checkout|early check|extend|stay longer|luggage|store|left luggage/.test(msg)) {
    return {
      actionable: true, category: 'Concierge', priority: 'Normal',
      title: message.length > 40 ? message.slice(0, 40) + '…' : message,
      description: `Concierge request: ${message}`,
      reply: `Of course. I've forwarded your request to our Front Desk team, who will take care of this for you.`,
    };
  }

  return {
    actionable: true, category: 'Concierge', priority: 'Normal',
    title: message.length > 45 ? message.slice(0, 45) + '…' : message,
    description: `Guest request: ${message}`,
    reply: `I've sent your request to our team. They'll take care of this for you right away, ${guestName.split(' ')[0]}.`,
  };
}

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

export async function loadConversation(
  guestId: string,
  stayId: string,
  guestName: string,
): Promise<Conversation | null> {
  const conv = await getOrCreateConversation(guestId, stayId);
  if (!conv) return null;

  await ensureWelcomeMessage(conv.id, guestName);
  const messages = await getMessages(conv.id);

  return {
    id: conv.id,
    guestId,
    title: 'Concierge conversation',
    messages: messages.map(rowToMessage),
    createdAt: messages[0]?.timestamp ?? new Date().toISOString(),
    lastActivityAt: messages[messages.length - 1]?.timestamp ?? new Date().toISOString(),
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
  if (!conv) return null;

  // Save guest message
  await addMessage(conv.id, 'guest', content);

  // Parse intent (mock AI for now)
  const intent = parseIntent(content, guestName, roomNumber);

  // Create request if actionable
  let request: HotelRequest | undefined;
  if (intent.actionable) {
    const input: CreateRequestInput = {
      hotelId,
      guestId,
      stayId,
      roomId,
      conversationId: conv.id,
      title: intent.title,
      description: intent.description,
      category: intent.category,
      priority: intent.priority,
    };
    request = await createRequest(input) ?? undefined;
  }

  // Save assistant message
  const assistantRow = await addMessage(conv.id, 'assistant', intent.reply, request?.id);
  if (!assistantRow) return null;

  // Reload all messages
  const messages = await getMessages(conv.id);

  const conversation: Conversation = {
    id: conv.id,
    guestId,
    title: 'Concierge conversation',
    messages: messages.map(rowToMessage),
    createdAt: messages[0]?.timestamp ?? new Date().toISOString(),
    lastActivityAt: messages[messages.length - 1]?.timestamp ?? new Date().toISOString(),
  };

  return {
    conversation,
    assistantMessage: rowToMessage(assistantRow),
    request,
  };
}
