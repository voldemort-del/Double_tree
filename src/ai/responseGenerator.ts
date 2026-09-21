import type { ConciergeContext } from './types';
import type { ClassifiedIntent } from './intentClassifier';
import type { ExtractedRequestData } from './requestExtractor';
import { searchHotelKnowledge } from '@/services/hotelKnowledgeService';

export async function generateResponse(
  message: string,
  classified: ClassifiedIntent,
  extracted: ExtractedRequestData,
  context: ConciergeContext,
): Promise<string> {
  const firstName = context.guestName ? context.guestName.split(' ')[0] : 'there';
  const room = context.roomNumber ? `room ${context.roomNumber}` : 'your room';
  const lower = message.toLowerCase();

  // 1. Emergency Response
  if (classified.intent === 'emergency') {
    return `If this is an immediate danger or medical emergency, please contact emergency services immediately (dial 112 in Malta) or alert the Front Desk. I've also flagged this as an urgent hotel request for our operations team.`;
  }

  // 2. Existing Request Actions (Cancellations / Status Checks)
  if (classified.intent === 'existing_request_action') {
    if (/cancel|withdraw|stop|delete/i.test(lower)) {
      return `I understand you would like to cancel your previous request, ${firstName}. You can manage and track all your active requests directly in the Requests tab, or speak with our Front Desk team at any time.`;
    }
    return `You can view the real-time status and staff assignment of all your active requests in the Requests tab above. Please let me know if you need any additional help!`;
  }

  // 3. General Conversation & Greetings
  if (classified.intent === 'general_conversation') {
    if (/thanks|thank you|thx|cheers|appreciated/i.test(lower)) {
      return `You're very welcome, ${firstName}! Please let me know if there's anything else I can do to make your stay comfortable.`;
    }
    if (/good morning/i.test(lower)) {
      return `Good morning, ${firstName}! How may I assist you today?`;
    }
    if (/good afternoon/i.test(lower)) {
      return `Good afternoon, ${firstName}! How can I assist with your stay today?`;
    }
    if (/good evening/i.test(lower)) {
      return `Good evening, ${firstName}! I hope you're enjoying your evening. How can I help?`;
    }
    return `Hello ${firstName}! I'm your digital concierge. How can I assist you with your stay at DoubleTree by Hilton Malta?`;
  }

  // 4. Hotel Knowledge / Informational Queries
  if (classified.intent === 'hotel_information') {
    // Check if guest is asking for specific unconfigured operational details like hours/prices
    if (/\b(what time|what are the hours|when does.*(start|open|close|end)|schedule|hours of operation|price|cost|how much)\b/i.test(lower)) {
      if (/breakfast/i.test(lower)) {
        return `Breakfast is served at Azure Restaurant & Terrace. The exact hours are not currently configured in our knowledge system, and I don't want to give you an incorrect answer. Please check with our Front Desk team or your keycard jacket for seasonal timing.`;
      }
      return `That specific schedule or pricing information is not currently configured in our system, and I don't want to give you an incorrect answer. Please check with our Front Desk team.`;
    }

    // Query structured hotel knowledge base from Supabase (or in-memory verified fallback)
    const knowledgeItems = await searchHotelKnowledge(context.hotelId, message);
    if (knowledgeItems.length > 0) {
      return knowledgeItems[0].content;
    }

    // Unknown information fallback — never hallucinate
    return `I don't have that information available right now, and I don't want to give you an incorrect answer. Would you like me to connect you with our Front Desk team?`;
  }

  // 5. Housekeeping Requests
  if (classified.intent === 'housekeeping_request') {
    if (/two extra towels|2 extra towels|two towels|2 towels/i.test(lower)) {
      return `Absolutely. I've sent a request to Housekeeping for two extra towels for ${room}. Our team will deliver them shortly.`;
    }
    if (/towel/i.test(lower)) {
      return `Certainly. I've requested extra towels from our Housekeeping team for ${room}.`;
    }
    if (/toiletries|soap|shampoo/i.test(lower)) {
      return `Of course. I've notified Housekeeping to replenish your toiletries in ${room}.`;
    }
    if (/pillow|blanket|duvet/i.test(lower)) {
      return `Understood. I've placed a request with Housekeeping to deliver extra bedding to ${room}.`;
    }
    return `Certainly, ${firstName}. I've sent a request to Housekeeping for ${room}. The team has been notified.`;
  }

  // 6. Maintenance Requests
  if (classified.intent === 'maintenance_request') {
    if (/cold|freezing|chilly/i.test(lower)) {
      return `I'm sorry to hear your room is uncomfortable, ${firstName}. I've sent this to Maintenance as a high-priority room climate issue for ${room}. Our engineering team has been dispatched.`;
    }
    if (/ac|air condition/i.test(lower)) {
      return `I've sent this to Maintenance as a high-priority room issue. The team has been notified for ${room} and will inspect the AC unit promptly.`;
    }
    if (/leak|plumbing|toilet/i.test(lower)) {
      return `I apologize for the inconvenience. I've created a high-priority ticket for our Maintenance team to attend to ${room} right away.`;
    }
    return `I've reported this issue to our Maintenance team for ${room}. Our technician will look into it promptly.`;
  }

  // 7. Food & Beverage / Room Service
  if (classified.intent === 'food_beverage_request') {
    if (/room service/i.test(lower)) {
      return `I've initiated a room service request for ${room}. Our Food & Beverage team has been notified and can assist with your in-room order.`;
    }
    return `Certainly! I've sent your dining request to our Food & Beverage team for ${room}.`;
  }

  // 8. Spa & Wellness
  if (classified.intent === 'spa_request') {
    return `I've sent your request to our Myoka Spa team for ${room}. A spa coordinator will check availability and confirm your booking details shortly.`;
  }

  // 9. Concierge / Taxi / Transport / Dining Bookings
  if (classified.intent === 'concierge_request') {
    if (/taxi|airport|transfer|cab/i.test(lower)) {
      return `Certainly, ${firstName}. I've sent a request to our Concierge team to arrange your taxi transfer for ${room}. Our desk will coordinate the booking.`;
    }
    if (/restaurant|table|dinner|lunch|reservation/i.test(lower)) {
      return `Certainly, ${firstName}. I've sent a request to our Concierge team to assist with your restaurant reservation for ${room}. Our desk will contact you to confirm the details.`;
    }
    if (/iron|ironing/i.test(lower)) {
      return `Certainly, ${firstName}. I've requested an iron and ironing board to be delivered to ${room}.`;
    }
    if (/adapter|charger/i.test(lower)) {
      return `Of course, ${firstName}. I've logged a request with our Concierge team to deliver an adapter to ${room}.`;
    }
    if (/umbrella/i.test(lower)) {
      return `Certainly, ${firstName}. I've requested an umbrella for you from our Concierge desk for ${room}.`;
    }
    return `I've forwarded your request to our Concierge team for ${room}. We will arrange this for you right away, ${firstName}.`;
  }

  // 10. Complaint
  if (classified.intent === 'complaint') {
    return `I sincerely apologize for the inconvenience you've experienced, ${firstName}. I have flagged this directly to our Front Desk and Duty Manager so we can address this for ${room} immediately.`;
  }

  // Fallback
  if (extracted.actionRequired && extracted.department) {
    return `I've sent your request to our ${extracted.department} team for ${room}. They'll take care of this for you right away, ${firstName}.`;
  }

  return `I can help with that, ${firstName}. Please let me know what you would like me to arrange for ${room}, such as housekeeping, maintenance, dining, or spa services.`;
}
