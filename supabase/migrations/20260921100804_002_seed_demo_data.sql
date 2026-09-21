/*
# Seed demo data for DoubleTree by Hilton Malta

## Summary
Inserts the core seed data needed to run the prototype:
- The hotel (DoubleTree by Hilton Malta)
- 5 demo rooms (212, 224, 317, 408, 501)
- Demo guest (Alex Morgan, username: guest, PIN: 1234)
- Active stay for Alex Morgan in room 408
- 8 hotel departments
- Demo SLA rules per priority
- Demo sample requests and request events

## Important Notes
1. All inserts are idempotent — uses ON CONFLICT DO NOTHING or checks.
2. The hotel_id is stored in a variable for reuse across inserts.
3. Room 408 is assigned to the demo guest via the stays table.
4. Sample requests demonstrate various statuses (new, assigned, in_progress, completed, overdue).
*/

-- ============================================================
-- Hotel
-- ============================================================
INSERT INTO hotels (id, name, location, address)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'DoubleTree by Hilton Malta',
  'Qawra, St Paul''s Bay, Malta',
  'Triq it-Turisti, Qawra, St Paul''s Bay, Malta'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Rooms
-- ============================================================
INSERT INTO rooms (hotel_id, room_number, room_type, floor, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', '212', 'City View Queen', 2, 'occupied'),
  ('a0000000-0000-0000-0000-000000000001', '224', 'Garden View King', 2, 'occupied'),
  ('a0000000-0000-0000-0000-000000000001', '317', 'Sea View Twin', 3, 'occupied'),
  ('a0000000-0000-0000-0000-000000000001', '408', 'Sea View King', 4, 'occupied'),
  ('a0000000-0000-0000-0000-000000000001', '501', 'Sea View King', 5, 'available')
ON CONFLICT (hotel_id, room_number) DO NOTHING;

-- ============================================================
-- Departments
-- ============================================================
INSERT INTO departments (hotel_id, name, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Front Desk', 'Guest reception and front of house operations'),
  ('a0000000-0000-0000-0000-000000000001', 'Housekeeping', 'Room cleaning, linen, and housekeeping services'),
  ('a0000000-0000-0000-0000-000000000001', 'Maintenance', 'Building, room, and facility maintenance'),
  ('a0000000-0000-0000-0000-000000000001', 'Food & Beverage', 'Restaurants, bars, and room service'),
  ('a0000000-0000-0000-0000-000000000001', 'Concierge', 'Guest services, transport, and information'),
  ('a0000000-0000-0000-0000-000000000001', 'Spa & Wellness', 'Myoka Spa and wellness treatments'),
  ('a0000000-0000-0000-0000-000000000001', 'Pool & Recreation', 'Pools, beach access, and kids club'),
  ('a0000000-0000-0000-0000-000000000001', 'Management', 'Hotel management and operations oversight')
ON CONFLICT (hotel_id, name) DO NOTHING;

-- ============================================================
-- Guest: Alex Morgan
-- ============================================================
INSERT INTO guests (id, hotel_id, first_name, last_name, username, pin, email, phone)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Alex',
  'Morgan',
  'guest',
  '1234',
  'alex.morgan@example.com',
  '+356 9900 0000'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Stay: Alex Morgan in Room 408
-- ============================================================
INSERT INTO stays (guest_id, room_id, check_in, check_out, status, adults, children)
SELECT
  'b0000000-0000-0000-0000-000000000001',
  r.id,
  NOW() - INTERVAL '3 days',
  NOW() + INTERVAL '4 days',
  'active',
  2,
  0
FROM rooms r
WHERE r.hotel_id = 'a0000000-0000-0000-0000-000000000001' AND r.room_number = '408'
AND NOT EXISTS (
  SELECT 1 FROM stays s WHERE s.guest_id = 'b0000000-0000-0000-0000-000000000001' AND s.status = 'active'
);

-- ============================================================
-- SLA Rules (per priority, hotel-wide)
-- ============================================================
INSERT INTO sla_rules (hotel_id, priority, response_minutes, completion_minutes)
SELECT 'a0000000-0000-0000-0000-000000000001', priority, resp, comp
FROM (VALUES
  ('low', 60, 120),
  ('normal', 30, 60),
  ('high', 15, 45),
  ('urgent', 10, 20)
) AS t(priority, resp, comp)
WHERE NOT EXISTS (
  SELECT 1 FROM sla_rules sr
  WHERE sr.hotel_id = 'a0000000-0000-0000-0000-000000000001' AND sr.priority = t.priority
);

-- ============================================================
-- Staff profiles (for prototype — no auth.users link yet)
-- ============================================================
INSERT INTO staff_profiles (hotel_id, first_name, last_name, email, role, username, department_id)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  v.first_name,
  v.last_name,
  v.email,
  v.role::text,
  v.username,
  d.id
FROM (VALUES
  ('Maria', 'Vella', 'maria.vella@doubletreemalta.com', 'staff', 'Housekeeping', 'staff'),
  ('Daniel', 'Zahra', 'daniel.zahra@doubletreemalta.com', 'staff', 'Maintenance', 'staff2'),
  ('Lucia', 'Grech', 'lucia.grech@doubletreemalta.com', 'staff', 'Concierge', 'staff3'),
  ('Antoine', 'Caruana', 'antoine.caruana@doubletreemalta.com', 'manager', 'Front Desk', 'manager')
) AS v(first_name, last_name, email, role, dept_name, username)
LEFT JOIN departments d ON d.hotel_id = 'a0000000-0000-0000-0000-000000000001' AND d.name = v.dept_name
WHERE NOT EXISTS (
  SELECT 1 FROM staff_profiles sp
  WHERE sp.hotel_id = 'a0000000-0000-0000-0000-000000000001' AND sp.username = v.username
);

-- ============================================================
-- Sample requests + events for demo
-- ============================================================
-- We need the stay_id and room_id for Alex Morgan
DO $$
DECLARE
  v_stay_id uuid;
  v_room_id uuid;
  v_housekeeping_dept uuid;
  v_maintenance_dept uuid;
  v_concierge_dept uuid;
  v_fb_dept uuid;
  v_spa_dept uuid;
  v_maria_id uuid;
  v_daniel_id uuid;
  v_lucia_id uuid;
  v_conversation_id uuid;
BEGIN
  SELECT s.id INTO v_stay_id FROM stays s WHERE s.guest_id = 'b0000000-0000-0000-0000-000000000001' AND s.status = 'active' LIMIT 1;
  SELECT r.id INTO v_room_id FROM rooms r WHERE r.hotel_id = 'a0000000-0000-0000-0000-000000000001' AND r.room_number = '408';

  SELECT id INTO v_housekeeping_dept FROM departments WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Housekeeping';
  SELECT id INTO v_maintenance_dept FROM departments WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Maintenance';
  SELECT id INTO v_concierge_dept FROM departments WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Concierge';
  SELECT id INTO v_fb_dept FROM departments WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Food & Beverage';
  SELECT id INTO v_spa_dept FROM departments WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Spa & Wellness';

  SELECT id INTO v_maria_id FROM staff_profiles WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND username = 'staff';
  SELECT id INTO v_daniel_id FROM staff_profiles WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND username = 'staff2';
  SELECT id INTO v_lucia_id FROM staff_profiles WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND username = 'staff3';

  -- Create conversation for Alex Morgan
  INSERT INTO conversations (guest_id, stay_id, title, status)
  VALUES ('b0000000-0000-0000-0000-000000000001', v_stay_id, 'Concierge conversation', 'active')
  RETURNING id INTO v_conversation_id;

  -- Welcome message
  INSERT INTO messages (conversation_id, sender_type, content)
  VALUES (v_conversation_id, 'assistant', 'Good evening, Alex. I''m your digital concierge for your stay at DoubleTree by Hilton Malta. How can I help you this evening?');

  -- Request 1: Extra towels (new)
  INSERT INTO requests (hotel_id, guest_id, stay_id, room_id, conversation_id, department_id, title, description, category, status, priority, source, sla_due_at)
  VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    v_stay_id, v_room_id, v_conversation_id, v_housekeeping_dept,
    'Extra towels', 'Guest requested two additional towels for Room 408.',
    'Housekeeping', 'new', 'normal', 'concierge',
    NOW() + INTERVAL '52 minutes'
  );
  -- Events for request 1
  INSERT INTO request_events (request_id, actor_type, event_type, message)
  SELECT id, 'guest', 'created', 'Request submitted' FROM requests WHERE title = 'Extra towels' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;
  INSERT INTO request_events (request_id, actor_type, event_type, message)
  SELECT id, 'assistant', 'routed', 'Sent to Housekeeping' FROM requests WHERE title = 'Extra towels' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;

  -- Request 2: Room service (new)
  INSERT INTO requests (hotel_id, guest_id, stay_id, room_id, conversation_id, department_id, title, description, category, status, priority, source, sla_due_at)
  VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    v_stay_id, v_room_id, v_conversation_id, v_fb_dept,
    'Room service — pasta & wine', 'Guest ordered spaghetti carbonara and a glass of house red wine.',
    'Room Service', 'new', 'normal', 'concierge',
    NOW() + INTERVAL '42 minutes'
  );
  INSERT INTO request_events (request_id, actor_type, event_type, message)
  SELECT id, 'guest', 'created', 'Request submitted' FROM requests WHERE title = 'Room service — pasta & wine' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;
  INSERT INTO request_events (request_id, actor_type, event_type, message)
  SELECT id, 'assistant', 'routed', 'Sent to Food & Beverage' FROM requests WHERE title = 'Room service — pasta & wine' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;

  -- Request 3: Extra pillows (completed)
  INSERT INTO requests (hotel_id, guest_id, stay_id, room_id, department_id, assigned_staff_id, title, description, category, status, priority, source, sla_due_at, created_at, assigned_at, started_at, completed_at)
  VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    v_stay_id, v_room_id, v_housekeeping_dept, v_maria_id,
    'Extra pillows', 'Guest requested two extra pillows.',
    'Housekeeping', 'completed', 'low', 'concierge',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '5 hours',
    NOW() - INTERVAL '4.9 hours',
    NOW() - INTERVAL '4.8 hours',
    NOW() - INTERVAL '4.5 hours'
  );
  INSERT INTO request_events (request_id, actor_type, actor_id, event_type, message, created_at)
  SELECT id, 'guest', NULL, 'created', 'Request submitted', NOW() - INTERVAL '5 hours' FROM requests WHERE title = 'Extra pillows' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;
  INSERT INTO request_events (request_id, actor_type, actor_id, event_type, message, created_at)
  SELECT id, 'assistant', NULL, 'routed', 'Sent to Housekeeping', NOW() - INTERVAL '5 hours' FROM requests WHERE title = 'Extra pillows' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;
  INSERT INTO request_events (request_id, actor_type, actor_id, event_type, message, created_at)
  SELECT id, 'staff', v_maria_id, 'assigned', 'Maria Vella assigned', NOW() - INTERVAL '4.9 hours' FROM requests WHERE title = 'Extra pillows' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;
  INSERT INTO request_events (request_id, actor_type, actor_id, event_type, message, created_at)
  SELECT id, 'staff', v_maria_id, 'started', 'Request in progress', NOW() - INTERVAL '4.8 hours' FROM requests WHERE title = 'Extra pillows' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;
  INSERT INTO request_events (request_id, actor_type, actor_id, event_type, message, created_at)
  SELECT id, 'staff', v_maria_id, 'completed', 'Request completed', NOW() - INTERVAL '4.5 hours' FROM requests WHERE title = 'Extra pillows' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;

  -- Request 4: Late checkout (completed)
  INSERT INTO requests (hotel_id, guest_id, stay_id, room_id, department_id, assigned_staff_id, title, description, category, status, priority, source, sla_due_at, created_at, assigned_at, started_at, completed_at)
  VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    v_stay_id, v_room_id, v_concierge_dept, v_lucia_id,
    'Late checkout request', 'Guest requested a late checkout at 2:00 PM.',
    'Concierge', 'completed', 'normal', 'concierge',
    NOW() - INTERVAL '19 hours',
    NOW() - INTERVAL '20 hours',
    NOW() - INTERVAL '19.9 hours',
    NOW() - INTERVAL '19.5 hours',
    NOW() - INTERVAL '18 hours'
  );
  INSERT INTO request_events (request_id, actor_type, actor_id, event_type, message, created_at)
  SELECT id, 'guest', NULL, 'created', 'Request submitted', NOW() - INTERVAL '20 hours' FROM requests WHERE title = 'Late checkout request' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;
  INSERT INTO request_events (request_id, actor_type, actor_id, event_type, message, created_at)
  SELECT id, 'assistant', NULL, 'routed', 'Sent to Concierge', NOW() - INTERVAL '20 hours' FROM requests WHERE title = 'Late checkout request' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;
  INSERT INTO request_events (request_id, actor_type, actor_id, event_type, message, created_at)
  SELECT id, 'staff', v_lucia_id, 'assigned', 'Lucia Grech assigned', NOW() - INTERVAL '19.9 hours' FROM requests WHERE title = 'Late checkout request' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;
  INSERT INTO request_events (request_id, actor_type, actor_id, event_type, message, created_at)
  SELECT id, 'staff', v_lucia_id, 'started', 'Request in progress', NOW() - INTERVAL '19.5 hours' FROM requests WHERE title = 'Late checkout request' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;
  INSERT INTO request_events (request_id, actor_type, actor_id, event_type, message, created_at)
  SELECT id, 'staff', v_lucia_id, 'completed', 'Request completed', NOW() - INTERVAL '18 hours' FROM requests WHERE title = 'Late checkout request' AND guest_id = 'b0000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1;

END $$;
