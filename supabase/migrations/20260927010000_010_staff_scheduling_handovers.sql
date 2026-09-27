-- Staff scheduling, shift state, and structured shift handovers.

CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  shift_type text NOT NULL DEFAULT 'custom' CHECK (shift_type IN ('morning','afternoon','evening','night','custom')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','completed','cancelled','no_show')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time <> start_time)
);

CREATE INDEX IF NOT EXISTS staff_shifts_hotel_date_idx ON public.staff_shifts(hotel_id, shift_date, start_time);
CREATE INDEX IF NOT EXISTS staff_shifts_staff_date_idx ON public.staff_shifts(staff_id, shift_date);
CREATE INDEX IF NOT EXISTS staff_shifts_department_date_idx ON public.staff_shifts(department_id, shift_date);

CREATE TABLE IF NOT EXISTS public.shift_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES public.staff_shifts(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shift_handover_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id uuid NOT NULL REFERENCES public.shift_handovers(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('request','maintenance','housekeeping','room','follow_up','event')),
  request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  maintenance_work_order_id uuid REFERENCES public.maintenance_work_orders(id) ON DELETE SET NULL,
  housekeeping_task_id uuid REFERENCES public.housekeeping_tasks(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  title text NOT NULL,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','carried_forward','waiting','resolved')),
  assigned_staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  manager_attention boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_handovers_hotel_created_idx ON public.shift_handovers(hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shift_handover_items_handover_idx ON public.shift_handover_items(handover_id, status);

ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_handover_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_staff_shifts_read ON public.staff_shifts;
CREATE POLICY authenticated_staff_shifts_read ON public.staff_shifts FOR SELECT TO authenticated
USING (
  public.is_hotel_manager(hotel_id)
  OR staff_id = public.current_staff_id()
);

DROP POLICY IF EXISTS authenticated_shift_handovers_read ON public.shift_handovers;
CREATE POLICY authenticated_shift_handovers_read ON public.shift_handovers FOR SELECT TO authenticated
USING (
  public.is_hotel_manager(hotel_id)
  OR created_by = public.current_staff_id()
  OR EXISTS (
    SELECT 1 FROM public.shift_handover_items i
    WHERE i.handover_id = shift_handovers.id
      AND i.assigned_staff_id = public.current_staff_id()
  )
);

DROP POLICY IF EXISTS authenticated_shift_handover_items_read ON public.shift_handover_items;
CREATE POLICY authenticated_shift_handover_items_read ON public.shift_handover_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shift_handovers h
    WHERE h.id = shift_handover_items.handover_id
      AND (
        public.is_hotel_manager(h.hotel_id)
        OR h.created_by = public.current_staff_id()
        OR shift_handover_items.assigned_staff_id = public.current_staff_id()
      )
  )
);

CREATE OR REPLACE FUNCTION public.create_staff_shift(
  p_hotel_id uuid, p_staff_id uuid, p_department_id uuid, p_shift_date date,
  p_start_time time, p_end_time time, p_shift_type text, p_notes text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_hotel_manager(p_hotel_id) THEN RAISE EXCEPTION 'Manager access required'; END IF;
  INSERT INTO public.staff_shifts (hotel_id, staff_id, department_id, shift_date, start_time, end_time, shift_type, notes)
  VALUES (p_hotel_id, p_staff_id, p_department_id, p_shift_date, p_start_time, p_end_time, p_shift_type, COALESCE(p_notes, ''))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_staff_shift(
  p_shift_id uuid, p_shift_date date, p_start_time time, p_end_time time,
  p_shift_type text, p_status text, p_notes text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_shifts s WHERE s.id = p_shift_id AND public.is_hotel_manager(s.hotel_id)
  ) THEN RAISE EXCEPTION 'Manager access required'; END IF;
  UPDATE public.staff_shifts
  SET shift_date = p_shift_date, start_time = p_start_time, end_time = p_end_time,
      shift_type = p_shift_type, status = p_status, notes = COALESCE(p_notes, ''), updated_at = now()
  WHERE id = p_shift_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_staff_shift(p_shift_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.staff_shifts SET status = 'active', updated_at = now()
  WHERE id = p_shift_id AND staff_id = public.current_staff_id() AND status = 'scheduled';
  IF NOT FOUND THEN RAISE EXCEPTION 'Shift cannot be started'; END IF;
  INSERT INTO public.staff_availability (staff_id, status) VALUES (public.current_staff_id(), 'available')
  ON CONFLICT (staff_id) DO UPDATE SET status = 'available', updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.end_staff_shift(p_shift_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.staff_shifts SET status = 'completed', updated_at = now()
  WHERE id = p_shift_id AND staff_id = public.current_staff_id() AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Shift cannot be ended'; END IF;
  INSERT INTO public.staff_availability (staff_id, status) VALUES (public.current_staff_id(), 'off_shift')
  ON CONFLICT (staff_id) DO UPDATE SET status = 'off_shift', updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_staff_shift(p_shift_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.staff_shifts SET status = 'cancelled', updated_at = now()
  WHERE id = p_shift_id AND public.is_hotel_manager(hotel_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Manager access required'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_shift_handover(p_shift_id uuid, p_notes text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_handover uuid; v_hotel uuid; v_shift_staff uuid;
BEGIN
  SELECT hotel_id, staff_id INTO v_hotel, v_shift_staff FROM public.staff_shifts WHERE id = p_shift_id;
  IF v_shift_staff IS NULL OR v_shift_staff <> public.current_staff_id() THEN RAISE EXCEPTION 'Staff shift required'; END IF;
  INSERT INTO public.shift_handovers (hotel_id, shift_id, created_by, notes)
  VALUES (v_hotel, p_shift_id, public.current_staff_id(), COALESCE(p_notes, '')) RETURNING id INTO v_handover;

  INSERT INTO public.shift_handover_items (handover_id, item_type, request_id, room_id, title, note, manager_attention)
  SELECT v_handover, 'request', r.id, r.room_id, r.title, r.description, r.priority = 'urgent'
  FROM public.requests r
  WHERE r.assigned_staff_id = public.current_staff_id()
    AND r.status NOT IN ('completed', 'cancelled');

  INSERT INTO public.shift_handover_items (handover_id, item_type, housekeeping_task_id, room_id, title, note, manager_attention)
  SELECT v_handover, 'housekeeping', t.id, t.room_id, t.title, t.description, t.priority = 'urgent'
  FROM public.housekeeping_tasks t
  WHERE t.assigned_staff_id = public.current_staff_id()
    AND t.status NOT IN ('completed', 'cancelled');

  INSERT INTO public.shift_handover_items (handover_id, item_type, maintenance_work_order_id, room_id, title, note, manager_attention)
  SELECT v_handover, 'maintenance', w.id, w.room_id, w.title, w.description, w.priority = 'urgent'
  FROM public.maintenance_work_orders w
  WHERE w.assigned_staff_id = public.current_staff_id()
    AND w.status NOT IN ('closed', 'cancelled', 'verified');
  RETURN v_handover;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_shift_handover_item(
  p_item_id uuid, p_status text, p_note text, p_assigned_staff_id uuid, p_manager_attention boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.shift_handover_items i
  SET status = p_status, note = COALESCE(p_note, note),
      assigned_staff_id = p_assigned_staff_id,
      manager_attention = COALESCE(p_manager_attention, manager_attention)
  WHERE i.id = p_item_id
    AND EXISTS (
      SELECT 1 FROM public.shift_handovers h
      WHERE h.id = i.handover_id
        AND (public.is_hotel_manager(h.hotel_id) OR h.created_by = public.current_staff_id())
    );
  IF NOT FOUND THEN RAISE EXCEPTION 'Handover item access denied'; END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_staff_shift(uuid, uuid, uuid, date, time, time, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_staff_shift(uuid, date, time, time, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_staff_shift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_staff_shift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_staff_shift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_shift_handover(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_shift_handover_item(uuid, text, text, uuid, boolean) TO authenticated;
