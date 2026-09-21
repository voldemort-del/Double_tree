import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { HotelKnowledgeRow } from '@/types/database';

export interface HotelKnowledgeItem {
  id: string;
  hotelId: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  source: string;
  isActive: boolean;
}

// ============================================================
// In-memory verified knowledge base for DoubleTree by Hilton Malta
// Used when in demo mode or when Supabase is offline.
// Strictly contains verified facts. Never invents hours or prices.
// ============================================================

export const DEFAULT_KNOWLEDGE: HotelKnowledgeItem[] = [
  {
    id: 'k-1',
    hotelId: 'a0000000-0000-0000-0000-000000000001',
    category: 'hotel',
    title: 'Resort Overview',
    content: "DoubleTree by Hilton Malta is a Mediterranean seafront resort located in Qawra, St Paul's Bay, Malta, offering upscale hospitality, private beach access, and extensive leisure amenities.",
    keywords: ['hotel', 'doubletree', 'about', 'resort', 'overview', 'property', 'malta'],
    source: 'hotel configuration',
    isActive: true,
  },
  {
    id: 'k-2',
    hotelId: 'a0000000-0000-0000-0000-000000000001',
    category: 'location',
    title: 'Location & Setting',
    content: "DoubleTree by Hilton Malta is located along the seafront in Qawra, St Paul's Bay, Malta, with views of the Mediterranean Sea and easy access to the seaside promenade and local bus connections.",
    keywords: ['location', 'where', 'address', 'area', 'qawra', 'st paul', "st paul's bay", 'setting', 'seafront', 'located'],
    source: 'hotel configuration',
    isActive: true,
  },
  {
    id: 'k-3',
    hotelId: 'a0000000-0000-0000-0000-000000000001',
    category: 'facilities',
    title: 'Hotel Facilities',
    content: "DoubleTree by Hilton Malta features private beach access, indoor and outdoor swimming pool facilities, Myoka Spa, fitness facilities, a Kids' Club, six restaurants and bars, 24-hour room service, and meeting/event facilities.",
    keywords: ['facilities', 'amenities', 'what do you have', 'what does the hotel have', 'offer', 'features', 'amenity', 'facility'],
    source: 'hotel configuration',
    isActive: true,
  },
  {
    id: 'k-4',
    hotelId: 'a0000000-0000-0000-0000-000000000001',
    category: 'pool',
    title: 'Swimming Pools',
    content: "The hotel offers three outdoor swimming pools overlooking St Paul's Bay and one indoor heated pool adjacent to the wellness area. Pool towels are provided on the pool deck.",
    keywords: ['pool', 'pools', 'swimming', 'swimming pool', 'indoor pool', 'outdoor pool', 'heated pool', 'swim', 'water'],
    source: 'hotel configuration',
    isActive: true,
  },
  {
    id: 'k-5',
    hotelId: 'a0000000-0000-0000-0000-000000000001',
    category: 'spa',
    title: 'Myoka Spa Facilities',
    content: 'Yes, the hotel has Myoka Spa on-site, offering massage therapies, facials, and wellness treatments. Spa appointments can be requested directly through this concierge.',
    keywords: ['spa', 'massage', 'wellness', 'treatment', 'facials', 'myoka', 'relaxation'],
    source: 'hotel configuration',
    isActive: true,
  },
  {
    id: 'k-6',
    hotelId: 'a0000000-0000-0000-0000-000000000001',
    category: 'fitness',
    title: 'Fitness Centre',
    content: 'Yes, the hotel has fitness facilities available to guests, equipped with cardio and strength training equipment.',
    keywords: ['gym', 'fitness', 'workout', 'exercise', 'weights', 'cardio', 'fitness centre', 'fitness center', 'gymnasium'],
    source: 'hotel configuration',
    isActive: true,
  },
  {
    id: 'k-7',
    hotelId: 'a0000000-0000-0000-0000-000000000001',
    category: 'kids',
    title: "Kids' Club",
    content: "Yes, DoubleTree by Hilton Malta has a Kids' Club providing family-friendly activities and recreation for children.",
    keywords: ['kids', 'kids club', 'children', 'child', 'family', 'toddler', "kids' club"],
    source: 'hotel configuration',
    isActive: true,
  },
  {
    id: 'k-8',
    hotelId: 'a0000000-0000-0000-0000-000000000001',
    category: 'beach',
    title: 'Private Beach Access',
    content: 'The hotel enjoys direct private beach access on the Qawra seafront with Mediterranean sea views.',
    keywords: ['beach', 'sea', 'coast', 'waterfront', 'private beach', 'ocean', 'sand'],
    source: 'hotel configuration',
    isActive: true,
  },
  {
    id: 'k-9',
    hotelId: 'a0000000-0000-0000-0000-000000000001',
    category: 'dining',
    title: 'Restaurants & Dining Venues',
    content: 'The hotel features six dining venues: Azure Restaurant & Terrace (Mediterranean & buffet dining), Ombré Café Bistro, Juniper Lounge Bar, Kora, Sabi House, and Carvv Restaurant & Enoteca.',
    keywords: ['restaurant', 'restaurants', 'dining', 'dinner', 'lunch', 'eat', 'food', 'venues', 'where can i eat', 'bar', 'bars', 'cafe'],
    source: 'hotel configuration',
    isActive: true,
  },
  {
    id: 'k-10',
    hotelId: 'a0000000-0000-0000-0000-000000000001',
    category: 'services',
    title: 'Room Service',
    content: 'Yes, in-room dining and room service are available for hotel guests. You can place a room service request through the concierge.',
    keywords: ['room service', 'in-room dining', 'order to room', 'food to room', 'room delivery'],
    source: 'hotel configuration',
    isActive: true,
  },
  {
    id: 'k-11',
    hotelId: 'a0000000-0000-0000-0000-000000000001',
    category: 'events',
    title: 'Meeting & Event Spaces',
    content: 'The hotel offers dedicated meeting and conference spaces, banquet facilities, and outdoor event terraces.',
    keywords: ['meeting', 'meetings', 'events', 'conference', 'banquet', 'wedding'],
    source: 'hotel configuration',
    isActive: true,
  },
];

function rowToItem(row: HotelKnowledgeRow): HotelKnowledgeItem {
  return {
    id: row.id,
    hotelId: row.hotel_id,
    category: row.category,
    title: row.title,
    content: row.content,
    keywords: row.keywords ?? [],
    source: row.source,
    isActive: row.is_active,
  };
}

/**
 * Fetch all active knowledge items for a hotel.
 */
export async function getHotelKnowledge(hotelId: string): Promise<HotelKnowledgeItem[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('hotel_knowledge')
        .select('*')
        .eq('hotel_id', hotelId)
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        return (data as HotelKnowledgeRow[]).map(rowToItem);
      }
    } catch (err) {
      console.warn('getHotelKnowledge query failed, falling back to default knowledge:', err);
    }
  }

  return DEFAULT_KNOWLEDGE.filter((k) => k.isActive);
}

/**
 * Fetch knowledge items by category.
 */
export async function getKnowledgeByCategory(
  hotelId: string,
  category: string,
): Promise<HotelKnowledgeItem[]> {
  const all = await getHotelKnowledge(hotelId);
  return all.filter((item) => item.category.toLowerCase() === category.toLowerCase());
}

/**
 * Search hotel knowledge using keyword matching.
 * Prepared for future semantic/vector embeddings search.
 */
export async function searchHotelKnowledge(
  hotelId: string,
  query: string,
): Promise<HotelKnowledgeItem[]> {
  const all = await getHotelKnowledge(hotelId);
  const q = query.toLowerCase().trim();

  // Score each item based on keyword overlaps and content matches
  const scored = all.map((item) => {
    let score = 0;

    // Direct keyword array match (highest confidence)
    for (const kw of item.keywords) {
      const lkw = kw.toLowerCase();
      if (q.includes(lkw)) {
        score += 10;
      }
      if (lkw.includes(q)) {
        score += 5;
      }
    }

    // Category match
    if (q.includes(item.category.toLowerCase())) {
      score += 6;
    }

    // Title match
    if (item.title.toLowerCase().split(/\s+/).some((w) => w.length > 3 && q.includes(w))) {
      score += 4;
    }

    // Content substring check
    const contentWords = item.content.toLowerCase().split(/\s+/);
    const queryWords = q.split(/\s+/).filter((w) => w.length > 3);
    for (const qw of queryWords) {
      if (contentWords.includes(qw)) {
        score += 2;
      }
    }

    return { item, score };
  });

  // Filter items with positive score, sorted highest first
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
}
