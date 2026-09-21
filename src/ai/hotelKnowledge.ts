// ============================================================
// DoubleTree by Hilton Malta — Ground Truth Hotel Knowledge
// Contains only verified facts. Never fabricate policies or prices.
// ============================================================

export interface HotelFact {
  topic: string;
  keywords: string[];
  summary: string;
  details: string;
}

export const HOTEL_PROFILE = {
  name: 'DoubleTree by Hilton Malta',
  location: "Qawra, St. Paul's Bay, Malta",
  setting: 'Mediterranean Seafront Resort',
  checkInTime: '3:00 PM',
  checkOutTime: '12:00 PM',
  emergencyPhone: '112 (Malta Emergency) / Front Desk (Dial 0 from room phone)',
  wifi: {
    network: 'DoubleTree Guest',
    info: 'Complimentary high-speed Wi-Fi is available across all guest rooms, public areas, and pool decks.',
  },
  facilities: [
    'Private beach access',
    'Three outdoor swimming pools and one indoor heated pool',
    'Myoka Spa & Wellness centre',
    'Fully-equipped fitness centre',
    "Kids' Club and family recreation",
    'Conference and event meeting spaces',
    '24-hour Front Desk and concierge assistance',
    'Room service dining',
  ],
  diningVenues: [
    {
      name: 'Azure Restaurant & Terrace',
      description: 'Mediterranean buffet and live cooking stations overlooking the bay. Serves daily breakfast.',
    },
    {
      name: 'Ombré Café Bistro',
      description: 'Artisan coffees, light bites, and fresh pastries.',
    },
    {
      name: 'Juniper Lounge Bar',
      description: 'Craft cocktails, wines, and evening aperitifs.',
    },
    {
      name: 'Carvv Restaurant & Enoteca',
      description: 'Premium cuts and curated Mediterranean wines.',
    },
    {
      name: 'Kora & Sabi House',
      description: 'Asian-inspired culinary experiences.',
    },
  ],
  spa: {
    name: 'Myoka Spa',
    services: ['Full-body massages', 'Facials', 'Body wraps', 'Aromatherapy treatments'],
    bookingPolicy: 'Advance reservations are recommended. You can request a booking directly through this concierge.',
  },
  pools: {
    outdoor: 'Three outdoor swimming pools with sun loungers and sea views.',
    indoor: 'One indoor heated pool located adjacent to the wellness area.',
    towels: 'Complimentary pool towels are available at the pool towel station.',
  },
};

export const KNOWLEDGE_BASE: HotelFact[] = [
  {
    topic: 'facilities',
    keywords: ['facility', 'facilities', 'amenity', 'amenities', 'what do you have', 'what does the hotel have', 'offer'],
    summary: 'DoubleTree by Hilton Malta offers comprehensive resort amenities.',
    details: `Our resort features private beach access, three outdoor swimming pools, an indoor heated pool, Myoka Spa, a fully-equipped fitness centre, a Kids' Club, six dining and bar venues, and room service.`,
  },
  {
    topic: 'breakfast',
    keywords: ['breakfast', 'morning meal', 'buffet breakfast'],
    summary: 'Breakfast is served at Azure Restaurant & Terrace.',
    details: `Breakfast is served at Azure Restaurant & Terrace featuring a Mediterranean buffet, live cooking stations, and freshly baked pastries. Please check with Front Desk or your welcome card for daily seasonal hours.`,
  },
  {
    topic: 'dining',
    keywords: ['restaurant', 'restaurants', 'dining', 'dinner', 'lunch', 'eat', 'food options', 'venues', 'bar', 'bars'],
    summary: 'Six dining and lounge venues are available on-site.',
    details: `We feature six distinct dining venues: Azure Restaurant & Terrace (buffet & Mediterranean), Ombré Café Bistro, Juniper Lounge Bar, Carvv Restaurant & Enoteca, Kora, and Sabi House. In-room dining is also available.`,
  },
  {
    topic: 'pools',
    keywords: ['pool', 'pools', 'swim', 'swimming', 'swimming pool', 'indoor pool', 'heated pool'],
    summary: 'Three outdoor pools and one indoor heated pool.',
    details: `We have three outdoor swimming pools overlooking St. Paul's Bay and one indoor heated pool next to the spa. Pool towels are provided complimentary at the pool deck towel station.`,
  },
  {
    topic: 'spa',
    keywords: ['spa', 'massage', 'facial', 'treatment', 'myoka', 'wellness'],
    summary: 'Myoka Spa offers massages, facials, and wellness treatments.',
    details: `Myoka Spa offers a full menu of relaxation treatments, therapeutic massages, and facials. You can request a treatment reservation here through the concierge, and our spa team will confirm availability.`,
  },
  {
    topic: 'gym',
    keywords: ['gym', 'fitness', 'workout', 'weights', 'exercise'],
    summary: 'Fitness centre equipped with cardio and strength equipment.',
    details: `Our fitness centre is equipped with cardio machines, free weights, and resistance equipment, accessible to all hotel guests.`,
  },
  {
    topic: 'beach',
    keywords: ['beach', 'sea', 'coast', 'waterfront', 'seafront'],
    summary: 'Direct private beach access on the Qawra seafront.',
    details: `The hotel enjoys a prime seafront location in Qawra with direct private beach access and Mediterranean views.`,
  },
  {
    topic: 'wifi',
    keywords: ['wifi', 'wi-fi', 'internet', 'network', 'password', 'connection'],
    summary: 'Complimentary high-speed Wi-Fi.',
    details: `Complimentary Wi-Fi is available throughout the hotel. Connect to "DoubleTree Guest" from your device settings. No password is required for registered guests.`,
  },
  {
    topic: 'checkout',
    keywords: ['checkout', 'check out', 'check-out', 'leaving', 'departure', 'late checkout'],
    summary: 'Check-out is at 12:00 PM; check-in is at 3:00 PM.',
    details: `Standard check-out is at 12:00 PM, and check-in is from 3:00 PM. Late check-out can be requested subject to room availability via our Front Desk team.`,
  },
  {
    topic: 'location',
    keywords: ['location', 'address', 'where are you', 'airport distance', 'valletta', 'bus', 'qawra', 'st paul'],
    summary: "Located in Qawra, St. Paul's Bay, Malta.",
    details: `We are located along the Qawra seafront in St. Paul's Bay, Malta, close to the Buġibba bus terminus with direct connections across the island. Airport taxis can be arranged via our concierge.`,
  },
];

export function findKnowledgeAnswer(query: string): string | null {
  const q = query.toLowerCase();

  for (const item of KNOWLEDGE_BASE) {
    if (item.keywords.some((k) => q.includes(k))) {
      return item.details;
    }
  }

  return null;
}
