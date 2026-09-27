CREATE OR REPLACE FUNCTION public.get_maintenance_team(p_hotel_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  department_name text,
  availability text,
  active_work_orders bigint,
  overdue_work_orders bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_hotel_manager(p_hotel_id) THEN
    RAISE EXCEPTION 'Only a hotel manager can view the maintenance team';
  END IF;

  RETURN QUERY
  SELECT
    sp.id,
    sp.first_name,
    sp.last_name,
    coalesce(d.name, 'Maintenance'),
    coalesce(sa.status, 'available'),
    count(wo.id) FILTER (WHERE wo.status NOT IN ('closed', 'cancelled', 'verified')),
    count(wo.id) FILTER (
      WHERE wo.status NOT IN ('closed', 'cancelled', 'verified')
        AND wo.due_at < now()
    )
  FROM public.staff_profiles sp
  LEFT JOIN public.departments d ON d.id = sp.department_id
  LEFT JOIN public.staff_availability sa ON sa.staff_id = sp.id
  LEFT JOIN public.maintenance_work_orders wo
    ON wo.assigned_staff_id = sp.id
    AND wo.status NOT IN ('closed', 'cancelled', 'verified')
  WHERE sp.hotel_id = p_hotel_id
    AND sp.role = 'staff'
    AND (
      d.name = 'Maintenance'
      OR EXISTS (
        SELECT 1
        FROM public.maintenance_eligibility me
        WHERE me.staff_id = sp.id AND me.hotel_id = sp.hotel_id
      )
    )
  GROUP BY sp.id, sp.first_name, sp.last_name, d.name, sa.status
  ORDER BY sp.first_name, sp.last_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_maintenance_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_maintenance_team(uuid) TO authenticated;
