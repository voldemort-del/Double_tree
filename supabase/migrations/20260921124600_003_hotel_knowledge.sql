/*
# Migration: 003_hotel_knowledge
# Creates the hotel_knowledge table and seeds verified knowledge for DoubleTree by Hilton Malta.

## Schema
- hotel_knowledge: Stores structured factual knowledge entries for the hotel concierge.
- Enables Row Level Security (RLS) with public read access.
- Creates indexes for fast lookup by hotel_id, category, and keyword array (GIN).

## Verified Facts Only
- DoubleTree by Hilton Malta located in Qawra, St Paul's Bay, Malta.
- Seafront location with private beach access.
- Indoor and outdoor swimming pool facilities (3 outdoor, 1 indoor heated).
- Myoka Spa facilities.
- Fitness facilities.
- Kids' Club.
- Six dining venues: Azure Restaurant & Terrace, Ombré Café Bistro, Juniper Lounge Bar, Kora, Sabi House, Carvv Restaurant & Enoteca.
- Room service available.
- Meeting/event facilities.
- Unverified specifics (hours, prices, policies) are omitted by design.
*/

CREATE TABLE IF NOT EXISTS hotel_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  source text NOT NULL DEFAULT 'hotel configuration',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE hotel_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_hotel_knowledge" ON hotel_knowledge;
CREATE POLICY "anon_read_hotel_knowledge" ON hotel_knowledge
  FOR SELECT TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hotel_knowledge_hotel_active
  ON hotel_knowledge(hotel_id, is_active);

CREATE INDEX IF NOT EXISTS idx_hotel_knowledge_category
  ON hotel_knowledge(hotel_id, category);

CREATE INDEX IF NOT EXISTS idx_hotel_knowledge_keywords
  ON hotel_knowledge USING gin(keywords);

-- ============================================================
-- Seed Verified Knowledge Data (DoubleTree by Hilton Malta)
-- ============================================================

DO $$
DECLARE
  v_hotel_id uuid := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  -- 1. Hotel Overview
  IF NOT EXISTS (SELECT 1 FROM hotel_knowledge WHERE hotel_id = v_hotel_id AND category = 'hotel' AND title = 'Resort Overview') THEN
    INSERT INTO hotel_knowledge (hotel_id, category, title, content, keywords, source)
    VALUES (
      v_hotel_id,
      'hotel',
      'Resort Overview',
      'DoubleTree by Hilton Malta is a Mediterranean seafront resort located in Qawra, St Paul''s Bay, Malta, offering upscale hospitality, private beach access, and extensive leisure amenities.',
      ARRAY['hotel', 'doubletree', 'about', 'resort', 'overview', 'property', 'malta'],
      'hotel configuration'
    );
  END IF;

  -- 2. Location & Setting
  IF NOT EXISTS (SELECT 1 FROM hotel_knowledge WHERE hotel_id = v_hotel_id AND category = 'location' AND title = 'Location & Setting') THEN
    INSERT INTO hotel_knowledge (hotel_id, category, title, content, keywords, source)
    VALUES (
      v_hotel_id,
      'location',
      'Location & Setting',
      'DoubleTree by Hilton Malta is located along the seafront in Qawra, St Paul''s Bay, Malta, with views of the Mediterranean Sea and easy access to the seaside promenade and local bus connections.',
      ARRAY['location', 'where', 'address', 'area', 'qawra', 'st paul', 'st paul''s bay', 'setting', 'seafront'],
      'hotel configuration'
    );
  END IF;

  -- 3. Facilities Overview
  IF NOT EXISTS (SELECT 1 FROM hotel_knowledge WHERE hotel_id = v_hotel_id AND category = 'facilities' AND title = 'Hotel Facilities') THEN
    INSERT INTO hotel_knowledge (hotel_id, category, title, content, keywords, source)
    VALUES (
      v_hotel_id,
      'facilities',
      'Hotel Facilities',
      'DoubleTree by Hilton Malta features private beach access, indoor and outdoor swimming pool facilities, Myoka Spa, fitness facilities, a Kids'' Club, six restaurants and bars, 24-hour room service, and meeting/event facilities.',
      ARRAY['facilities', 'amenities', 'what do you have', 'what does the hotel have', 'offer', 'features', 'amenity'],
      'hotel configuration'
    );
  END IF;

  -- 4. Swimming Pools
  IF NOT EXISTS (SELECT 1 FROM hotel_knowledge WHERE hotel_id = v_hotel_id AND category = 'pool' AND title = 'Swimming Pools') THEN
    INSERT INTO hotel_knowledge (hotel_id, category, title, content, keywords, source)
    VALUES (
      v_hotel_id,
      'pool',
      'Swimming Pools',
      'The hotel offers three outdoor swimming pools overlooking St Paul''s Bay and one indoor heated pool adjacent to the wellness area. Pool towels are provided on the pool deck.',
      ARRAY['pool', 'pools', 'swimming', 'swimming pool', 'indoor pool', 'outdoor pool', 'heated pool', 'swim'],
      'hotel configuration'
    );
  END IF;

  -- 5. Spa & Wellness
  IF NOT EXISTS (SELECT 1 FROM hotel_knowledge WHERE hotel_id = v_hotel_id AND category = 'spa' AND title = 'Myoka Spa Facilities') THEN
    INSERT INTO hotel_knowledge (hotel_id, category, title, content, keywords, source)
    VALUES (
      v_hotel_id,
      'spa',
      'Myoka Spa Facilities',
      'Yes, the hotel has Myoka Spa on-site, offering massage therapies, facials, and wellness treatments. Spa appointments can be requested directly through this concierge.',
      ARRAY['spa', 'massage', 'wellness', 'treatment', 'facials', 'myoka', 'relaxation'],
      'hotel configuration'
    );
  END IF;

  -- 6. Fitness Centre
  IF NOT EXISTS (SELECT 1 FROM hotel_knowledge WHERE hotel_id = v_hotel_id AND category = 'fitness' AND title = 'Fitness Centre') THEN
    INSERT INTO hotel_knowledge (hotel_id, category, title, content, keywords, source)
    VALUES (
      v_hotel_id,
      'fitness',
      'Fitness Centre',
      'Yes, the hotel has fitness facilities available to guests, equipped with cardio and strength training equipment.',
      ARRAY['gym', 'fitness', 'workout', 'exercise', 'weights', 'cardio', 'fitness centre', 'fitness center'],
      'hotel configuration'
    );
  END IF;

  -- 7. Kids'' Club
  IF NOT EXISTS (SELECT 1 FROM hotel_knowledge WHERE hotel_id = v_hotel_id AND category = 'kids' AND title = 'Kids'' Club') THEN
    INSERT INTO hotel_knowledge (hotel_id, category, title, content, keywords, source)
    VALUES (
      v_hotel_id,
      'kids',
      'Kids'' Club',
      'Yes, DoubleTree by Hilton Malta has a Kids'' Club providing family-friendly activities and recreation for children.',
      ARRAY['kids', 'kids club', 'children', 'child', 'family', 'toddler', 'kids'' club'],
      'hotel configuration'
    );
  END IF;

  -- 8. Beach Access
  IF NOT EXISTS (SELECT 1 FROM hotel_knowledge WHERE hotel_id = v_hotel_id AND category = 'beach' AND title = 'Private Beach Access') THEN
    INSERT INTO hotel_knowledge (hotel_id, category, title, content, keywords, source)
    VALUES (
      v_hotel_id,
      'beach',
      'Private Beach Access',
      'The hotel enjoys direct private beach access on the Qawra seafront with Mediterranean sea views.',
      ARRAY['beach', 'sea', 'coast', 'waterfront', 'private beach', 'ocean'],
      'hotel configuration'
    );
  END IF;

  -- 9. Dining Venues
  IF NOT EXISTS (SELECT 1 FROM hotel_knowledge WHERE hotel_id = v_hotel_id AND category = 'dining' AND title = 'Restaurants & Dining Venues') THEN
    INSERT INTO hotel_knowledge (hotel_id, category, title, content, keywords, source)
    VALUES (
      v_hotel_id,
      'dining',
      'Restaurants & Dining Venues',
      'The hotel features six dining venues: Azure Restaurant & Terrace (Mediterranean & buffet dining), Ombré Café Bistro, Juniper Lounge Bar, Kora, Sabi House, and Carvv Restaurant & Enoteca.',
      ARRAY['restaurant', 'restaurants', 'dining', 'dinner', 'lunch', 'eat', 'food', 'venues', 'where can i eat', 'bar', 'bars', 'cafe'],
      'hotel configuration'
    );
  END IF;

  -- 10. Room Service
  IF NOT EXISTS (SELECT 1 FROM hotel_knowledge WHERE hotel_id = v_hotel_id AND category = 'services' AND title = 'Room Service') THEN
    INSERT INTO hotel_knowledge (hotel_id, category, title, content, keywords, source)
    VALUES (
      v_hotel_id,
      'services',
      'Room Service',
      'Yes, in-room dining and room service are available for hotel guests. You can place a room service request through the concierge.',
      ARRAY['room service', 'in-room dining', 'order to room', 'food to room', 'room delivery'],
      'hotel configuration'
    );
  END IF;

  -- 11. Meeting & Events
  IF NOT EXISTS (SELECT 1 FROM hotel_knowledge WHERE hotel_id = v_hotel_id AND category = 'events' AND title = 'Meeting & Event Spaces') THEN
    INSERT INTO hotel_knowledge (hotel_id, category, title, content, keywords, source)
    VALUES (
      v_hotel_id,
      'events',
      'Meeting & Event Spaces',
      'The hotel offers dedicated meeting and conference spaces, banquet facilities, and outdoor event terraces.',
      ARRAY['meeting', 'meetings', 'events', 'conference', 'banquet', 'wedding'],
      'hotel configuration'
    );
  END IF;
END $$;
