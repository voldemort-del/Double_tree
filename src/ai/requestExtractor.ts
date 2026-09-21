import type { Department, RequestPriority } from '@/types';
import type { ConciergeIntent, ConciergeContext } from './types';
import type { ClassifiedIntent } from './intentClassifier';

export interface ExtractedRequestData {
  actionRequired: boolean;
  department?: Department;
  priority: RequestPriority;
  title?: string;
  description?: string;
  missingInformation: string[];
}

export function extractRequestData(
  message: string,
  classified: ClassifiedIntent,
  context: ConciergeContext,
): ExtractedRequestData {
  const lower = message.toLowerCase();
  const room = context.roomNumber ? `Room ${context.roomNumber}` : 'Guest Room';

  switch (classified.intent) {
    case 'emergency': {
      let title = 'Emergency safety report';
      if (/fire|smoke/i.test(lower)) title = 'Emergency: Smoke or fire reported';
      else if (/medical|unconscious|hurt|injured/i.test(lower)) title = 'Medical emergency reported';
      else if (/gas/i.test(lower)) title = 'Emergency: Gas odor reported';

      return {
        actionRequired: true,
        department: 'Front Desk',
        priority: 'Urgent',
        title,
        description: `URGENT GUEST REPORT for ${room}: "${message}". Immediate staff dispatch required.`,
        missingInformation: [],
      };
    }

    case 'housekeeping_request': {
      let title = 'Housekeeping request';
      if (/two extra towels|2 extra towels/i.test(lower)) {
        title = 'Two extra towels';
      } else if (/towels?/i.test(lower)) {
        title = 'Extra towels';
      } else if (/pillow/i.test(lower)) {
        title = 'Extra pillows';
      } else if (/blanket|duvet/i.test(lower)) {
        title = 'Extra blanket';
      } else if (/toiletries|soap|shampoo/i.test(lower)) {
        title = 'Replenish toiletries';
      } else if (/clean|make up/i.test(lower)) {
        title = 'Room cleaning request';
      }

      return {
        actionRequired: true,
        department: 'Housekeeping',
        priority: 'Normal',
        title,
        description: `Guest in ${room} requests: ${message}.`,
        missingInformation: [],
      };
    }

    case 'maintenance_request': {
      let title = 'Maintenance issue';
      let priority: RequestPriority = 'Normal';

      if (/cold|freezing|chilly/i.test(lower)) {
        title = 'Room temperature issue';
        priority = 'High';
      } else if (/ac|air condition/i.test(lower)) {
        title = 'Air conditioning issue';
        priority = 'High';
      } else if (/leak|plumbing|toilet/i.test(lower)) {
        title = 'Plumbing / leak report';
        priority = 'High';
      } else if (/light|bulb/i.test(lower)) {
        title = 'Lighting issue';
        priority = 'Normal';
      } else if (/tv|television/i.test(lower)) {
        title = 'Television issue';
        priority = 'Normal';
      } else if (/door|lock|keycard/i.test(lower)) {
        title = 'Door lock issue';
        priority = 'High';
      }

      return {
        actionRequired: true,
        department: 'Maintenance',
        priority,
        title,
        description: `Guest in ${room} reports: ${message}.`,
        missingInformation: [],
      };
    }

    case 'food_beverage_request': {
      let title = 'In-room dining inquiry / order';
      const missing: string[] = [];

      // Detect if user is merely inquiring vs placing an explicit order
      const isInquiryOnly =
        /what.*(eat|order|menu|available|have)|can i (see|have|get) (the )?menu|menu|food options|dining options|i('m| am) hungry/i.test(lower) &&
        !/(order|bring|send|deliver|want|have) (the |a |two |2 )?(spaghetti|carbonara|sea bass|steak|rabbit|penne|arrabbiata|chicken|bruschetta|soup|salad|tiramisu|imqaret|wine|beer|cisk|cappuccino|water|coke)/i.test(lower);

      const hasSpecificItem =
        /(spaghetti|carbonara|sea bass|steak|rabbit|penne|arrabbiata|chicken|bruschetta|soup|salad|tiramisu|imqaret|wine|beer|cisk|cappuccino|water|coke|juice|espresso)/i.test(lower);

      if (!hasSpecificItem || isInquiryOnly) {
        missing.push('menu_selection');
      }

      if (/room service/i.test(lower)) {
        title = 'Room service order';
      } else if (/drink|wine|cocktail|beer/i.test(lower)) {
        title = 'Bar / beverage order';
      } else {
        title = 'Dining order';
      }

      const actionRequired = hasSpecificItem && !isInquiryOnly;

      return {
        actionRequired,
        department: 'Food & Beverage',
        priority: 'Normal',
        title,
        description: actionRequired
          ? `Guest in ${room} orders: ${message}.`
          : `Guest in ${room} inquiring about dining/menu: ${message}.`,
        missingInformation: missing,
      };
    }

    case 'spa_request': {
      let title = 'Spa treatment booking';
      if (/massage/i.test(lower)) title = 'Massage appointment';
      else if (/facial/i.test(lower)) title = 'Facial treatment';

      const missing: string[] = [];
      const hasTime = /\b(\d{1,2}(:\d{2})?\s*(am|pm)?|\d{1,2}\s*(am|pm)|morning|afternoon|evening)\b/i.test(lower);
      const hasDate = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(st|nd|rd|th)?)\b/i.test(lower);

      if (!hasTime) missing.push('preferred_time');
      if (!hasDate) missing.push('preferred_date');

      const actionRequired = hasTime && hasDate;

      return {
        actionRequired,
        department: 'Spa & Wellness',
        priority: 'Normal',
        title,
        description: actionRequired
          ? `Guest in ${room} requests booking: ${message}.`
          : `Guest in ${room} inquiring about spa: ${message}.`,
        missingInformation: missing,
      };
    }

    case 'concierge_request': {
      let title = 'Concierge assistance';
      let priority: RequestPriority = 'Normal';

      if (/taxi|airport|transfer|cab/i.test(lower)) {
        title = /airport/i.test(lower) ? 'Airport taxi transfer' : 'Taxi booking request';
      } else if (/reservation|restaurant|table/i.test(lower)) {
        title = 'Restaurant reservation assistance';
      } else if (/iron|ironing/i.test(lower)) {
        title = 'Iron & ironing board delivery';
      } else if (/adapter|charger/i.test(lower)) {
        title = 'Universal adapter / charger request';
      } else if (/umbrella/i.test(lower)) {
        title = 'Umbrella request';
      } else if (/wake up|wake-up/i.test(lower)) {
        title = 'Wake-up call request';
      } else if (/luggage|bags|bellman/i.test(lower)) {
        title = 'Luggage assistance / bellman request';
      } else if (/tour|excursion|valletta/i.test(lower)) {
        title = 'Excursion / tour inquiry';
      } else {
        const cleaned = message.replace(/^(can i have|can i get|can we have|can we get|can you bring|can you send|could i get|could i have|please send|please bring|i need|i want|we need)\s+/i, '').trim();
        title = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Concierge guest request';
        if (title.length > 45) title = title.slice(0, 42) + '...';
      }

      return {
        actionRequired: true,
        department: 'Concierge',
        priority,
        title,
        description: `Guest in ${room} requests: ${message}.`,
        missingInformation: [],
      };
    }

    case 'pool_recreation_request': {
      return {
        actionRequired: true,
        department: 'Concierge',
        priority: 'Normal',
        title: 'Pool & recreation request',
        description: `Guest in ${room} requests: ${message}.`,
        missingInformation: [],
      };
    }

    case 'complaint': {
      return {
        actionRequired: true,
        department: 'Front Desk',
        priority: 'High',
        title: 'Guest feedback / complaint',
        description: `Guest in ${room} expressed concern: ${message}. Follow-up requested.`,
        missingInformation: [],
      };
    }

    case 'existing_request_action':
    case 'hotel_information':
    case 'general_conversation':
    case 'unknown':
    default:
      return {
        actionRequired: false,
        priority: 'Normal',
        missingInformation: [],
      };
  }
}
