/*
# Migration 004: Expand to 5 Operational Staff Members

## Summary
Expands hotel staff to 5 dedicated department specialists for task assignment:
1. Maria Vella — Housekeeping (staff)
2. Daniel Zahra — Maintenance (staff2)
3. Lucia Grech — Concierge (staff3)
4. Marco Bonnici — Food & Beverage (staff4)
5. Elena Borg — Spa & Wellness (staff5)
(Manager: Antoine Caruana — Management / Operations)

Enables managers to assign any task across all 5 hotel departments.
*/

-- ============================================================
-- 1. Insert Marco Bonnici (F&B) and Elena Borg (Spa & Wellness)
-- ============================================================
INSERT INTO staff_profiles (hotel_id, first_name, last_name, email, role, username, department_id)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  v.first_name,
  v.last_name,
  v.email,
  'staff',
  v.username,
  d.id
FROM (VALUES
  ('Marco', 'Bonnici', 'marco.bonnici@doubletreemalta.com', 'Food & Beverage', 'staff4'),
  ('Elena', 'Borg', 'elena.borg@doubletreemalta.com', 'Spa & Wellness', 'staff5')
) AS v(first_name, last_name, email, dept_name, username)
LEFT JOIN departments d ON d.hotel_id = 'a0000000-0000-0000-0000-000000000001' AND d.name = v.dept_name
WHERE NOT EXISTS (
  SELECT 1 FROM staff_profiles sp
  WHERE sp.hotel_id = 'a0000000-0000-0000-0000-000000000001' AND sp.username = v.username
);
