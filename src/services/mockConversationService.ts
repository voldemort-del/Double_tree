import type { Conversation, Message, HotelRequest } from '@/types';
import { initialConversations, guests } from '@/data/mockData';
import { mockRequestService } from './mockRequestService';
import { categoryToDepartment } from '@/utils/format';

// ============================================================
// Mock conversation service.
// Generates canned AI responses and creates structured
// requests when the guest message is actionable.
// Swap with real AI + Supabase later — interface stays the same.
// ============================================================

let conversations: Conversation[] = initialConversations.map((c) => ({
  ...c,
  messages: [...c.messages],
}));

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

interface ParsedIntent {
  actionable: boolean;
  category: HotelRequest['category'];
  priority: HotelRequest['priority'];
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
        actionable: false,
        category: 'Information',
        priority: 'Normal',
        title: '',
        description: '',
        reply: 'Breakfast is served at Azure Restaurant & Terrace from 7:00 AM to 10:30 AM. Our breakfast includes a Mediterranean buffet, live cooking stations, and freshly baked pastries.',
      };
    }
    if (/pool|swim/.test(msg)) {
      return {
        actionable: false,
        category: 'Information',
        priority: 'Normal',
        title: '',
        description: '',
        reply: 'We have three outdoor swimming pools and one indoor heated pool. The main pool is open from 7:00 AM to 8:00 PM. Pool towels are available at the pool deck.',
      };
    }
    if (/spa|massage|treatment/.test(msg)) {
      return {
        actionable: false,
        category: 'Information',
        priority: 'Normal',
        title: '',
        description: '',
        reply: 'Myoka Spa offers a range of treatments including massages, facials, and body therapies. It is open daily from 9:00 AM to 8:00 PM. Would you like me to book a treatment for you?',
      };
    }
    if (/wifi|internet/.test(msg)) {
      return {
        actionable: false,
        category: 'Information',
        priority: 'Normal',
        title: '',
        description: '',
        reply: 'Complimentary Wi-Fi is available throughout the hotel. Connect to the network \u201cDoubleTree Guest\u201d using the password malta2024.',
      };
    }
    if (/checkout|check out/.test(msg)) {
      return {
        actionable: false,
        category: 'Information',
        priority: 'Normal',
        title: '',
        description: '',
        reply: 'Standard checkout time is 12:00 PM. Late checkout can be arranged subject to availability \u2014 just let me know and I will pass the request to our Front Desk.',
      };
    }
    return {
      actionable: false,
      category: 'Information',
      priority: 'Normal',
      title: '',
      description: '',
      reply: "I can help with that. Let me know if you would like me to arrange something for you \u2014 such as housekeeping, room service, maintenance, or a spa booking.",
    };
  }

  // Actionable requests
  if (/towel|pillow|sheet|blanket|toilet|extra|housekeep|clean/.test(msg)) {
    const isHigh = /urgent|immediately|asap/.test(msg);
    const item = msg.includes('towel') ? 'towels' : msg.includes('pillow') ? 'pillows' : msg.includes('sheet') ? 'sheets' : msg.includes('blanket') ? 'blankets' : 'housekeeping items';
    return {
      actionable: true,
      category: 'Housekeeping',
      priority: isHigh ? 'High' : 'Normal',
      title: `Extra ${item}`,
      description: `Guest requested ${message}`,
      reply: `Of course. I\u2019ve sent a housekeeping request for ${message.toLowerCase()} to Room ${roomNumber}.`,
    };
  }

  if (/ac|air con|aircon|air conditioning|heating|cold|hot|broken|not working|repair|fix|maintenance|leak|noise|light|tv|television|plug|socket|door|lock/.test(msg)) {
    const isUrgent = /not working|broken|flood|leak|no power|urgent|asap/.test(msg);
    return {
      actionable: true,
      category: 'Maintenance',
      priority: isUrgent ? 'High' : 'Normal',
      title: message.length > 40 ? message.slice(0, 40) + '\u2026' : message,
      description: `Guest reports: ${message}`,
      reply: isUrgent
        ? `I\u2019m sorry about that. I\u2019ve created a maintenance request for Room ${roomNumber} and marked it as high priority. Our maintenance team will be there shortly.`
        : `I\u2019ve created a maintenance request for Room ${roomNumber}. Our team will look into this right away.`,
    };
  }

  if (/room service|food|order|eat|dinner|lunch|breakfast in room|menu|wine|drink|coffee|tea|sandwich|pasta|pizza|salad|dessert/.test(msg)) {
    const hasItem = /(carbonara|sea bass|steak|rabbit|penne|tiramisu|cisk|wine)/i.test(msg);
    if (!hasItem) {
      return {
        actionable: false,
        category: 'Room Service',
        priority: 'Normal',
        title: 'Menu inquiry',
        description: `Guest asked about menu: ${message}`,
        reply: `Hello! Our dining menu includes Bruschetta al Pomodoro, Spaghetti Carbonara, Grilled Sea Bass, Maltese Rabbit Stew, Beef Tenderloin, Penne Arrabbiata, Tiramisu, fine Maltese wines, and Cisk beers. Please let me know what you would like to order!`,
      };
    }
    return {
      actionable: true,
      category: 'Room Service',
      priority: 'Normal',
      title: message.length > 45 ? message.slice(0, 45) + '\u2026' : message,
      description: `Room service order: ${message}`,
      reply: `Certainly. I\u2019ve placed your dining order for Room ${roomNumber}. Our Food & Beverage team will prepare this for you.`,
    };
  }

  if (/spa|massage|treatment|facial|wellness|sauna/.test(msg)) {
    const hasTime = /\b(\d{1,2}(:\d{2})?\s*(am|pm)?|\d{1,2}\s*(am|pm)|morning|afternoon|evening)\b/i.test(msg);
    const hasDate = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(msg);
    if (!hasTime || !hasDate) {
      return {
        actionable: false,
        category: 'Spa & Wellness',
        priority: 'Normal',
        title: 'Spa booking inquiry',
        description: `Guest asked about spa: ${message}`,
        reply: `Hello! We would be delighted to arrange a spa treatment at Myoka 5 Senses Spa for you. Could you please specify your preferred treatment along with the date and time?`,
      };
    }
    return {
      actionable: true,
      category: 'Spa & Wellness',
      priority: 'Normal',
      title: 'Spa treatment request',
      description: `Guest requested: ${message}`,
      reply: `Certainly. I’ve submitted your spa booking request for Room ${roomNumber}. Our Spa & Wellness team will confirm your appointment shortly.`,
    };
  }

  if (/taxi|transport|car|airport|shuttle|bus|drive|pick up|pickup|valletta|mdina|sliema/.test(msg)) {
    return {
      actionable: true,
      category: 'Transportation',
      priority: 'Normal',
      title: message.length > 40 ? message.slice(0, 40) + '\u2026' : message,
      description: `Transportation request: ${message}`,
      reply: `Certainly. I\u2019ve sent this to our concierge team to arrange transportation for you. If you have a specific destination, please share it and I\u2019ll add it to the request.`,
    };
  }

  if (/late checkout|early check|extend|stay longer|luggage|store|left luggage/.test(msg)) {
    return {
      actionable: true,
      category: 'Concierge',
      priority: 'Normal',
      title: message.length > 40 ? message.slice(0, 40) + '\u2026' : message,
      description: `Concierge request: ${message}`,
      reply: `Of course. I\u2019ve forwarded your request to our Front Desk team, who will take care of this for you.`,
    };
  }

  // Default: treat as general concierge request
  return {
    actionable: true,
    category: 'Concierge',
    priority: 'Normal',
    title: message.length > 45 ? message.slice(0, 45) + '\u2026' : message,
    description: `Guest request: ${message}`,
    reply: `I\u2019ve sent your request to our ${categoryToDepartment('Concierge')} team. They\u2019ll take care of this for you right away, ${guestName.split(' ')[0]}.`,
  };
}

export interface ConversationResult {
  conversation: Conversation;
  assistantMessage: Message;
  request?: HotelRequest;
}

export const mockConversationService = {
  getConversation(guestId: string): Conversation {
    let conv = conversations.find((c) => c.guestId === guestId);
    if (!conv) {
      const guest = guests.find((g) => g.id === guestId);
      conv = {
        id: newId('conv'),
        guestId,
        title: 'Concierge conversation',
        messages: [
          {
            id: newId('m'),
            conversationId: '',
            role: 'assistant',
            content: `Good ${greeting()}, ${guest?.name.split(' ')[0] ?? 'there'}. I\u2019m your digital concierge. How can I make your stay more comfortable?`,
            timestamp: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };
      conv.messages[0].conversationId = conv.id;
      conversations = [...conversations, conv];
    }
    return conv;
  },

  sendMessage(guestId: string, content: string): ConversationResult {
    const conv = this.getConversation(guestId);
    const guest = guests.find((g) => g.id === guestId);
    const guestName = guest?.name ?? 'Guest';
    const roomNumber = guest?.roomNumber ?? '';

    const guestMsg: Message = {
      id: newId('m'),
      conversationId: conv.id,
      role: 'guest',
      content,
      timestamp: new Date().toISOString(),
    };

    const intent = parseIntent(content, guestName, roomNumber);

    let request: HotelRequest | undefined;
    if (intent.actionable && guest) {
      request = mockRequestService.createRequest({
        guestId,
        roomNumber,
        title: intent.title,
        description: intent.description,
        category: intent.category,
        priority: intent.priority,
        conversationId: conv.id,
      });
    }

    const assistantMsg: Message = {
      id: newId('m'),
      conversationId: conv.id,
      role: 'assistant',
      content: intent.reply,
      timestamp: new Date().toISOString(),
      requestId: request?.id,
    };

    conv.messages = [...conv.messages, guestMsg, assistantMsg];
    conv.lastActivityAt = new Date().toISOString();

    return { conversation: conv, assistantMessage: assistantMsg, request };
  },
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
