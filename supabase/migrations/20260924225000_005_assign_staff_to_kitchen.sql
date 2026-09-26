/*
# Migration 005: Put all operational staff in the kitchen department

The five demo staff accounts are the kitchen team. Keep their database
department aligned with the demo login data and manager assignment picker.
*/

UPDATE staff_profiles
SET department_id = (
  SELECT id
  FROM departments
  WHERE hotel_id = staff_profiles.hotel_id
    AND name = 'Food & Beverage'
)
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001'
  AND role = 'staff';
