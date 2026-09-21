import type { ConciergeIntent, ConciergeContext } from './types';

// Emergency keywords
const EMERGENCY_PATTERNS = [
  /\b(fire|smoke|gas leak|burning|explosion)\b/i,
  /\b(medical emergency|ambulance|unconscious|heart attack|stroke|choking)\b/i,
  /\b(someone is hurt|injured|bleeding severely|in danger|intruder)\b/i,
  /\b(emergency|urgent medical)\b/i,
];

// Existing request cancellation or lookup
const EXISTING_REQUEST_PATTERNS = [
  /\b(cancel|withdraw|disregard|stop|delete)\b.*\b(request|order|ticket|previous|housekeeping|towels?|maintenance)\b/i,
  /\b(status of|check on|update on|where is my|what happened to)\b.*\b(request|order|ticket)\b/i,
];

// Question words indicating information query
const QUESTION_PATTERNS = [
  /^(what|where|when|which|who|how|is there|are there|do you have|can you tell me|does the hotel|tell me about|is the|are the)\b/i,
  /\b(what time|what are the hours|where is|where are|tell me about|directions to)\b/i,
];

// Action indicators that override generic questions (e.g. "Can I get two extra towels?", "Can you book a restaurant for me?")
const ACTION_PATTERNS = [
  /\b(bring|send|deliver|get|give|order|book|reserve|arrange|fix|repair|clean|replace|need|want|require|request|provide|schedule|would like|like to have)\b/i,
  /\b(can i have|can i get|can we have|can we get|can you bring|can you send|could i get|could i have|could you send|could you bring|could we have|please send|please bring|please deliver|can you book|could you book)\b/i,
];

export interface ClassifiedIntent {
  intent: ConciergeIntent;
  confidence: number;
  isUrgent: boolean;
  isQuestion: boolean;
  matchedKeywords: string[];
}

export function classifyIntent(message: string, _context?: ConciergeContext): ClassifiedIntent {
  const text = message.trim();
  const lower = text.toLowerCase();

  // 1. Check Emergency First
  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        intent: 'emergency',
        confidence: 0.98,
        isUrgent: true,
        isQuestion: false,
        matchedKeywords: [lower.match(pattern)?.[0] ?? 'emergency'],
      };
    }
  }

  // 2. Check Existing Request Management
  for (const pattern of EXISTING_REQUEST_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        intent: 'existing_request_action',
        confidence: 0.95,
        isUrgent: false,
        isQuestion: false,
        matchedKeywords: [lower.match(pattern)?.[0] ?? 'existing_request'],
      };
    }
  }

  // 3. Check General Conversation, Self-Identity, Greetings & Gratitude
  if (
    /^(thanks|thank you|thx|cheers|appreciated|many thanks|perfect thanks)[.!]?$/i.test(lower) ||
    /^(hi|hello|hey|good (morning|afternoon|evening)|howdy)[.!, ]*.*$/i.test(lower) ||
    /^(ok|okay|sounds good|understood|great|awesome|bye|goodbye)[.!]?$/i.test(lower) ||
    /\b(how are you|how are you doing|how('?s| is) it going|how do you do|how r u)\b/i.test(lower) ||
    /\b(who are you|what are you|what can you do|tell me about yourself|introduce yourself|what is your role|what is your name|your purpose|what do you do)\b/i.test(lower)
  ) {
    return {
      intent: 'general_conversation',
      confidence: 0.98,
      isUrgent: false,
      isQuestion: false,
      matchedKeywords: ['general_conversation'],
    };
  }

  // Determine if it's an action or informational question
  const hasAction = ACTION_PATTERNS.some((p) => p.test(lower));
  const isQuestion = QUESTION_PATTERNS.some((p) => p.test(lower)) && !hasAction;

  // 4. Maintenance / Room climate / Faults (checked before housekeeping to avoid 'air conditioner' matching 'conditioner')
  if (/\b(ac|air conditioning|air conditioner|cold|freezing|chilly|too hot|heat|heating|leak|leaking|plumbing|toilet|clogged|sink|shower|no hot water|hot water|broken|not working|bulb|light|television|tv|remote|safe|door lock|power|electricity)\b/i.test(lower)) {
    const isHighPriority = /\b(freezing|cold|too hot|leak|leaking|flood|broken|no hot water|toilet clogged)\b/i.test(lower);
    return {
      intent: 'maintenance_request',
      confidence: 0.95,
      isUrgent: isHighPriority,
      isQuestion: false,
      matchedKeywords: ['maintenance'],
    };
  }

  // 5. Housekeeping
  if (/\b(towel|towels|bath towel|toiletries|soap|shampoo|(hair\s+)?conditioner|lotion|shower gel|pillow|pillows|blanket|duvet|bedsheet|bedding|clean the room|housekeeping|turn down|turndown|robe|slippers|toilet paper|trash|bin|linens?)\b/i.test(lower) && !/\b(air conditioner|air conditioning)\b/i.test(lower)) {
    if (isQuestion && !hasAction) {
      return { intent: 'hotel_information', confidence: 0.85, isUrgent: false, isQuestion: true, matchedKeywords: ['housekeeping_info'] };
    }
    return {
      intent: 'housekeeping_request',
      confidence: 0.95,
      isUrgent: false,
      isQuestion: false,
      matchedKeywords: ['housekeeping'],
    };
  }

  // 6. Food & Beverage / Room Service / Dining
  if (/\b(room service|order food|dinner|breakfast|lunch|snack|drink|beverage|menu|coffee|tea|wine|beer|water bottle|bottle of water|bottled water|water|ice bucket|ice)\b/i.test(lower)) {
    // Check if asking general info vs placing a request
    if (isQuestion && !hasAction && !/room service/i.test(lower)) {
      return {
        intent: 'hotel_information',
        confidence: 0.9,
        isUrgent: false,
        isQuestion: true,
        matchedKeywords: ['dining_info'],
      };
    }
    return {
      intent: 'food_beverage_request',
      confidence: 0.92,
      isUrgent: false,
      isQuestion: false,
      matchedKeywords: ['food_beverage'],
    };
  }

  // 7. Spa & Wellness
  if (/\b(spa|massage|treatment|facial|body scrub|manicure|pedicure|wellness|myoka)\b/i.test(lower)) {
    if (isQuestion && !hasAction) {
      return {
        intent: 'hotel_information',
        confidence: 0.9,
        isUrgent: false,
        isQuestion: true,
        matchedKeywords: ['spa_info'],
      };
    }
    return {
      intent: 'spa_request',
      confidence: 0.92,
      isUrgent: false,
      isQuestion: false,
      matchedKeywords: ['spa'],
    };
  }

  // 8. Pool & Recreation
  if (/\b(pool|pools|swimming|beach|gym|fitness|workout|sun lounger|cabana|kids club|tennis)\b/i.test(lower)) {
    if (isQuestion || !hasAction) {
      return {
        intent: 'hotel_information',
        confidence: 0.9,
        isUrgent: false,
        isQuestion: true,
        matchedKeywords: ['pool_recreation_info'],
      };
    }
    return {
      intent: 'pool_recreation_request',
      confidence: 0.88,
      isUrgent: false,
      isQuestion: false,
      matchedKeywords: ['pool_recreation'],
    };
  }

  // 9. Concierge / Transport / Bookings / Guest Amenities
  if (
    /\b(taxi|cab|airport|transfer|transport|car rental|car hire|excursion|tour|valletta|luggage|bags|iron|ironing board|reservation|restaurant reservation|table booking|adapter|charger|umbrella|wake up|wake-up|package|parcel|delivery)\b/i.test(lower) ||
    (/\b(book|reserve)\b/i.test(lower) && /\b(restaurant|table|dinner|lunch)\b/i.test(lower))
  ) {
    return {
      intent: 'concierge_request',
      confidence: 0.92,
      isUrgent: false,
      isQuestion: false,
      matchedKeywords: ['concierge'],
    };
  }

  // 10. Complaints
  if (/\b(complaint|complain|unacceptable|terrible|horrible|noisy|loud|disturbed|manager|rude)\b/i.test(lower)) {
    return {
      intent: 'complaint',
      confidence: 0.9,
      isUrgent: true,
      isQuestion: false,
      matchedKeywords: ['complaint'],
    };
  }

  // 11. Pure Hotel Information
  if (isQuestion || /\b(wifi|wi-fi|internet|checkout|check-out|check in|check-in|parking|location|address|facilities|amenities)\b/i.test(lower)) {
    return {
      intent: 'hotel_information',
      confidence: 0.85,
      isUrgent: false,
      isQuestion: true,
      matchedKeywords: ['hotel_information'],
    };
  }

  // 12. If guest is actively requesting an action/item not caught above, route to Concierge
  if (hasAction) {
    return {
      intent: 'concierge_request',
      confidence: 0.85,
      isUrgent: false,
      isQuestion: false,
      matchedKeywords: ['action_requested'],
    };
  }

  return {
    intent: 'unknown',
    confidence: 0.5,
    isUrgent: false,
    isQuestion: false,
    matchedKeywords: [],
  };
}
