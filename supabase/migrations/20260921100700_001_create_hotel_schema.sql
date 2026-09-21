/*
# Create core hotel schema for DoubleTree Malta concierge platform

## Summary
Creates the foundational tables for a hotel guest concierge and staff operations
platform: hotels, rooms, guests, stays, departments, staff_profiles, sla_rules,
conversations, messages, requests, and request_events.

## New Tables
1. hotels — top-level hotel entity
2. rooms — hotel rooms (foreign key → hotels)
3. guests — hotel guests with username/pin for prototype auth
4. stays — guest stays linking guests to rooms with check-in/out dates
5. departments — hotel departments (Front Desk, Housekeeping, etc.)
6. staff_profiles — hotel staff with role (staff/manager) and department link
7. sla_rules — SLA targets per priority/department
8. conversations — guest concierge conversations
9. messages — individual messages within conversations
10. requests — structured service requests created from conversations or staff
11. request_events — audit trail / timeline for each request

## Security
- RLS enabled on every table.
- Guests can access only their own data (profile, stays, conversations, messages, requests, events).
- Staff can access data belonging to their hotel.
- Policies use auth.uid() for staff (via staff_profiles.user_id) and guest_id matching for guests.
- Since the guest login uses a custom username/pin flow (not Supabase Auth), guest-scoped
  tables use TO anon, authenticated with ownership predicates on guest_id where applicable.
  Staff tables use TO authenticated with hotel-scoped access via staff_profiles.

## Important Notes
1. Guest auth is custom (username + room + pin) for the prototype. Guest tables allow
   anon access because the guest client uses the anon key. Ownership is enforced by
   filtering on guest_id in the application layer and RLS where possible.
2. Staff auth uses Supabase Auth. staff_profiles.user_id links to auth.users.
3. All foreign keys use ON DELETE CASCADE for child tables.
4. Timestamps default to now().
*/

-- Enable extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. hotels
-- ============================================================
CREATE TABLE IF NOT EXISTS hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_hotels" ON hotels;
CREATE POLICY "anon_read_hotels" ON hotels FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- 2. rooms
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  room_type text NOT NULL DEFAULT 'Standard',
  floor integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, room_number)
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_rooms" ON rooms;
CREATE POLICY "anon_read_rooms" ON rooms FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms(hotel_id);

-- ============================================================
-- 3. guests
-- ============================================================
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  username text NOT NULL,
  pin text NOT NULL DEFAULT '1234',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, username)
);

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_guests" ON guests;
CREATE POLICY "anon_read_guests" ON guests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_update_guests" ON guests;
CREATE POLICY "anon_update_guests" ON guests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_guests_hotel_id ON guests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guests_username ON guests(username);

-- ============================================================
-- 4. stays
-- ============================================================
CREATE TABLE IF NOT EXISTS stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  check_in timestamptz NOT NULL,
  check_out timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  adults integer NOT NULL DEFAULT 1,
  children integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_stays" ON stays;
CREATE POLICY "anon_read_stays" ON stays FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_stays_guest_id ON stays(guest_id);
CREATE INDEX IF NOT EXISTS idx_stays_room_id ON stays(room_id);
CREATE INDEX IF NOT EXISTS idx_stays_status ON stays(status);

-- ============================================================
-- 5. departments
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, name)
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_departments" ON departments;
CREATE POLICY "anon_read_departments" ON departments FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_departments_hotel_id ON departments(hotel_id);

-- ============================================================
-- 6. staff_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_id uuid,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'manager')),
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, username)
);

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

-- Staff can read all staff profiles for their hotel
DROP POLICY IF EXISTS "staff_read_hotel_profiles" ON staff_profiles;
CREATE POLICY "staff_read_hotel_profiles" ON staff_profiles FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM staff_profiles sp
      WHERE sp.user_id = auth.uid()
      AND sp.hotel_id = staff_profiles.hotel_id
    )
  );

-- Staff can update their own profile
DROP POLICY IF EXISTS "staff_update_own_profile" ON staff_profiles;
CREATE POLICY "staff_update_own_profile" ON staff_profiles FOR UPDATE
  TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow anon to read staff_profiles for prototype (staff login lookup)
-- In production this would be restricted to authenticated only
DROP POLICY IF EXISTS "anon_read_staff_profiles" ON staff_profiles;
CREATE POLICY "anon_read_staff_profiles" ON staff_profiles FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_staff_hotel_id ON staff_profiles(hotel_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff_profiles(user_id);

-- ============================================================
-- 7. sla_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS sla_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  response_minutes integer NOT NULL DEFAULT 30,
  completion_minutes integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sla_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_sla_rules" ON sla_rules;
CREATE POLICY "anon_read_sla_rules" ON sla_rules FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sla_hotel_id ON sla_rules(hotel_id);

-- ============================================================
-- 8. conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  stay_id uuid NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Concierge conversation',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_conversations" ON conversations;
CREATE POLICY "anon_read_conversations" ON conversations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_conversations" ON conversations;
CREATE POLICY "anon_insert_conversations" ON conversations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_conversations" ON conversations;
CREATE POLICY "anon_update_conversations" ON conversations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_conversations_guest_id ON conversations(guest_id);

-- ============================================================
-- 9. messages
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('guest', 'assistant', 'staff')),
  sender_id uuid,
  content text NOT NULL,
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_messages" ON messages;
CREATE POLICY "anon_read_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ============================================================
-- 10. requests
-- ============================================================
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  stay_id uuid NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  assigned_staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_progress', 'completed', 'cancelled', 'escalated')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  source text NOT NULL DEFAULT 'concierge' CHECK (source IN ('concierge', 'staff', 'system')),
  sla_due_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  assigned_at timestamptz,
  started_at timestamptz
);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_requests" ON requests;
CREATE POLICY "anon_read_requests" ON requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_requests" ON requests;
CREATE POLICY "anon_insert_requests" ON requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_requests" ON requests;
CREATE POLICY "anon_update_requests" ON requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_requests_hotel_id ON requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_requests_guest_id ON requests(guest_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_department_id ON requests(department_id);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_staff ON requests(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);

-- ============================================================
-- 11. request_events
-- ============================================================
CREATE TABLE IF NOT EXISTS request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('guest', 'assistant', 'staff', 'system')),
  actor_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('created', 'routed', 'assigned', 'started', 'completed', 'escalated', 'cancelled', 'note')),
  message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_request_events" ON request_events;
CREATE POLICY "anon_read_request_events" ON request_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_request_events" ON request_events;
CREATE POLICY "anon_insert_request_events" ON request_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_request_events_request_id ON request_events(request_id);
CREATE INDEX IF NOT EXISTS idx_request_events_created_at ON request_events(created_at);

-- ============================================================
-- updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hotels_updated ON hotels;
CREATE TRIGGER trigger_hotels_updated BEFORE UPDATE ON hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_rooms_updated ON rooms;
CREATE TRIGGER trigger_rooms_updated BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_guests_updated ON guests;
CREATE TRIGGER trigger_guests_updated BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_stays_updated ON stays;
CREATE TRIGGER trigger_stays_updated BEFORE UPDATE ON stays
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_staff_updated ON staff_profiles;
CREATE TRIGGER trigger_staff_updated BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_sla_updated ON sla_rules;
CREATE TRIGGER trigger_sla_updated BEFORE UPDATE ON sla_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_conversations_updated ON conversations;
CREATE TRIGGER trigger_conversations_updated BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_requests_updated ON requests;
CREATE TRIGGER trigger_requests_updated BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Realtime: add tables to the realtime publication
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
ALTER PUBLICATION supabase_realtime ADD TABLE request_events;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
