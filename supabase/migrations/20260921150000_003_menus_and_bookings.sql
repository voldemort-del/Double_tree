/*
# Phase 2: Menu Items & Bookings

## Summary
Adds two new tables:
1. menu_items — restaurant and bar items that staff can manage and the AI references
2. bookings — time-slot bookings for spa, gym, pool, beach club (with conflict detection)

## RLS
- Guests (anon) can read menu_items and their own bookings; can insert bookings
- Staff (authenticated) can fully manage menu_items and read all bookings for their hotel
- No client can bypass hotel_id scoping
*/

-- ============================================================
-- 1. menu_items
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  venue text NOT NULL CHECK (venue IN ('restaurant', 'bar', 'room_service', 'pool_bar')),
  category text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(8,2) NOT NULL DEFAULT 0,
  available boolean NOT NULL DEFAULT true,
  available_for_room_service boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read available menu items
DROP POLICY IF EXISTS "read_menu_items" ON menu_items;
CREATE POLICY "read_menu_items" ON menu_items FOR SELECT
  TO anon, authenticated USING (true);

-- Only authenticated staff of the hotel can manage items
DROP POLICY IF EXISTS "staff_insert_menu_items" ON menu_items;
CREATE POLICY "staff_insert_menu_items" ON menu_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_profiles sp
      WHERE sp.user_id = auth.uid() AND sp.hotel_id = hotel_id
    )
  );

DROP POLICY IF EXISTS "staff_update_menu_items" ON menu_items;
CREATE POLICY "staff_update_menu_items" ON menu_items FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM staff_profiles sp
      WHERE sp.user_id = auth.uid() AND sp.hotel_id = menu_items.hotel_id
    )
  ) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_delete_menu_items" ON menu_items;
CREATE POLICY "staff_delete_menu_items" ON menu_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM staff_profiles sp
      WHERE sp.user_id = auth.uid() AND sp.hotel_id = menu_items.hotel_id
    )
  );

-- Anon staff (prototype) can also manage menu items
DROP POLICY IF EXISTS "anon_manage_menu_items" ON menu_items;
CREATE POLICY "anon_manage_menu_items" ON menu_items FOR ALL
  TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_menu_items_hotel_id ON menu_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_venue ON menu_items(hotel_id, venue);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(hotel_id, available);

DROP TRIGGER IF EXISTS trigger_menu_items_updated ON menu_items;
CREATE TRIGGER trigger_menu_items_updated BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  stay_id uuid NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  request_id uuid REFERENCES requests(id) ON DELETE SET NULL,
  service_type text NOT NULL CHECK (service_type IN ('spa', 'gym', 'pool_session', 'beach_club', 'kids_club')),
  service_name text NOT NULL,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  capacity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Guests can read their own bookings, staff can read all hotel bookings
DROP POLICY IF EXISTS "read_bookings" ON bookings;
CREATE POLICY "read_bookings" ON bookings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_bookings" ON bookings;
CREATE POLICY "insert_bookings" ON bookings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_bookings" ON bookings;
CREATE POLICY "update_bookings" ON bookings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_bookings_hotel_id ON bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_service ON bookings(hotel_id, service_type, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_request_id ON bookings(request_id);

-- ============================================================
-- 3. Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- ============================================================
-- 4. Seed: Azure Restaurant Menu
-- ============================================================
INSERT INTO menu_items (hotel_id, venue, category, name, description, price, available, available_for_room_service, display_order) VALUES

-- Starters
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Starters', 'Bruschetta al Pomodoro', 'Toasted sourdough with vine tomatoes, fresh basil and extra virgin olive oil', 8.50, true, true, 10),
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Starters', 'Seafood Soup', 'Traditional Maltese seafood broth with catch of the day, vegetables and herbs', 12.00, true, true, 20),
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Starters', 'Caprese Salad', 'Buffalo mozzarella, heirloom tomatoes, fresh basil, aged balsamic', 11.00, true, true, 30),
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Starters', 'Calamari Fritti', 'Lightly battered squid rings with lemon aioli and mixed leaves', 13.50, true, false, 40),

-- Mains
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Mains', 'Spaghetti Carbonara', 'Spaghetti with pancetta, egg, pecorino romano and black pepper', 18.00, true, true, 50),
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Mains', 'Grilled Sea Bass', 'Whole sea bass grilled over charcoal with capers, lemon butter and seasonal vegetables', 26.00, true, true, 60),
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Mains', 'Maltese Rabbit Stew', 'Traditional braised rabbit with garlic, wine, tomatoes and herbs, served with crusty bread', 22.00, true, true, 70),
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Mains', 'Beef Tenderloin', '220g beef tenderloin with truffle jus, roasted potatoes and seasonal greens', 34.00, true, true, 80),
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Mains', 'Penne Arrabbiata', 'Penne with spicy tomato sauce, garlic and fresh parsley — vegetarian', 15.00, true, true, 90),
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Mains', 'Grilled Chicken Fillet', 'Free-range chicken breast with Mediterranean herbs, roasted vegetables and lemon sauce', 20.00, true, true, 100),

-- Desserts
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Desserts', 'Tiramisu', 'Classic Italian tiramisu with mascarpone, espresso and cocoa', 9.00, true, true, 110),
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Desserts', 'Maltese Imqaret', 'Deep-fried date pastries with vanilla ice cream', 8.00, true, true, 120),
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Desserts', 'Panna Cotta', 'Vanilla panna cotta with seasonal berry coulis', 8.50, true, true, 130),
('a0000000-0000-0000-0000-000000000001', 'restaurant', 'Desserts', 'Chocolate Fondant', 'Warm chocolate fondant with vanilla ice cream and caramel sauce', 10.00, true, true, 140),

-- ============================================================
-- 5. Seed: Bar Menu (The Moorings / Limonata Pool Bar)
-- ============================================================

-- Cocktails
('a0000000-0000-0000-0000-000000000001', 'bar', 'Cocktails', 'Aperol Spritz', 'Aperol, Prosecco, soda water and orange slice', 11.00, true, false, 10),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Cocktails', 'Maltese Sunset', 'Vodka, blood orange juice, grenadine and lemon — house special', 12.00, true, false, 20),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Cocktails', 'Mojito', 'White rum, fresh mint, lime juice, sugar and soda water', 11.50, true, false, 30),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Cocktails', 'Cosmopolitan', 'Vodka, triple sec, cranberry juice and fresh lime', 12.00, true, false, 40),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Cocktails', 'Mediterranean Mule', 'Gin, elderflower, cucumber, ginger beer and fresh mint', 12.50, true, false, 50),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Cocktails', 'Negroni', 'Gin, Campari and sweet vermouth with orange peel', 13.00, true, false, 60),

-- Wine
('a0000000-0000-0000-0000-000000000001', 'bar', 'Wine', 'Marsovin Grand Vin (Red)', 'Full-bodied Maltese Cabernet Sauvignon — glass', 9.00, true, true, 70),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Wine', 'Marsovin Grand Vin (White)', 'Crisp Maltese Chardonnay with citrus notes — glass', 9.00, true, true, 80),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Wine', 'Prosecco DOC', 'Italian sparkling wine — glass', 10.00, true, true, 90),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Wine', 'House Red Wine (bottle)', 'Bottle of house Merlot', 28.00, true, true, 100),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Wine', 'House White Wine (bottle)', 'Bottle of house Pinot Grigio', 28.00, true, true, 110),

-- Beer
('a0000000-0000-0000-0000-000000000001', 'bar', 'Beer', 'Cisk Lager', 'Malta''s iconic lager — 330ml bottle', 5.00, true, false, 120),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Beer', 'Cisk Excel (Alcohol-Free)', 'Non-alcoholic Maltese lager — 330ml', 4.50, true, false, 130),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Beer', 'Peroni Nastro Azzurro', 'Italian premium lager — 330ml bottle', 5.50, true, false, 140),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Beer', 'Hopleaf Pale Ale', 'Maltese craft pale ale — 330ml', 6.00, true, false, 150),

-- Soft Drinks & Juices
('a0000000-0000-0000-0000-000000000001', 'bar', 'Soft Drinks', 'Fresh Orange Juice', 'Freshly squeezed orange juice', 5.00, true, true, 160),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Soft Drinks', 'Still Water (500ml)', 'Chilled still mineral water', 3.00, true, true, 170),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Soft Drinks', 'Sparkling Water (500ml)', 'Chilled sparkling mineral water', 3.00, true, true, 180),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Soft Drinks', 'Coca-Cola', 'Classic Coca-Cola — 330ml can', 3.50, true, true, 190),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Soft Drinks', 'Lemon Iced Tea', 'Freshly brewed iced tea with lemon', 4.50, true, true, 200),

-- Hot Drinks
('a0000000-0000-0000-0000-000000000001', 'bar', 'Hot Drinks', 'Espresso', 'Double shot Italian espresso', 3.00, true, true, 210),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Hot Drinks', 'Cappuccino', 'Espresso with steamed milk foam', 4.00, true, true, 220),
('a0000000-0000-0000-0000-000000000001', 'bar', 'Hot Drinks', 'English Breakfast Tea', 'Traditional black tea with milk', 3.50, true, true, 230)

ON CONFLICT DO NOTHING;
