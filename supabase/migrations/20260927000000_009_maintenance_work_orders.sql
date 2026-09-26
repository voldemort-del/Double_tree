-- Maintenance operations and preventive work orders.

CREATE TABLE IF NOT EXISTS public.maintenance_eligibility (
  staff_id uuid PRIMARY KEY REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, hotel_id)
);

INSERT INTO public.maintenance_eligibility (staff_id, hotel_id)
SELECT id, hotel_id
FROM public.staff_profiles
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001'
  AND username = 'staff2'
  AND role = 'staff'
ON CONFLICT (staff_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.maintenance_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  reported_by_type text NOT NULL CHECK (reported_by_type IN ('guest', 'staff', 'system')),
  reported_by_guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  reported_by_staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  assigned_staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'reported' CHECK (status IN (
    'reported', 'assigned', 'acknowledged', 'diagnosing', 'repair_in_progress',
    'repair_completed', 'verification_required', 'verified', 'closed',
    'cancelled', 'deferred', 'blocked', 'escalated'
  )),
  room_impact text NOT NULL DEFAULT 'none' CHECK (room_impact IN ('none', 'maintenance', 'out_of_order')),
  room_status_before text,
  due_at timestamptz,
  assigned_at timestamptz,
  started_at timestamptz,
  diagnosed_at timestamptz,
  completed_at timestamptz,
  verified_at timestamptz,
  closed_at timestamptz,
  escalated_at timestamptz,
  diagnosis text NOT NULL DEFAULT '',
  resolution text NOT NULL DEFAULT '',
  parts_materials text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  schedule_id uuid,
  generated_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (reported_by_type = 'guest' AND reported_by_guest_id IS NOT NULL)
    OR (reported_by_type = 'staff' AND reported_by_staff_id IS NOT NULL)
    OR reported_by_type = 'system'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS maintenance_work_orders_request_uq
  ON public.maintenance_work_orders(request_id) WHERE request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_work_orders_schedule_occurrence_uq
  ON public.maintenance_work_orders(schedule_id, generated_for)
  WHERE schedule_id IS NOT NULL AND generated_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS maintenance_work_orders_hotel_status_idx
  ON public.maintenance_work_orders(hotel_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS maintenance_work_orders_due_idx
  ON public.maintenance_work_orders(hotel_id, due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS maintenance_work_orders_room_category_idx
  ON public.maintenance_work_orders(room_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS maintenance_work_orders_assignee_idx
  ON public.maintenance_work_orders(assigned_staff_id, status, due_at);
CREATE INDEX IF NOT EXISTS maintenance_work_orders_request_idx
  ON public.maintenance_work_orders(request_id) WHERE request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.maintenance_work_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.maintenance_work_orders(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('guest', 'staff', 'manager', 'system')),
  actor_id uuid,
  event_type text NOT NULL,
  message text NOT NULL DEFAULT '',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maintenance_work_order_events_order_created_idx
  ON public.maintenance_work_order_events(work_order_id, created_at);

CREATE TABLE IF NOT EXISTS public.maintenance_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.maintenance_work_orders(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  content_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0),
  uploaded_by uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maintenance_attachments_work_order_idx
  ON public.maintenance_attachments(work_order_id, created_at);

CREATE TABLE IF NOT EXISTS public.preventive_maintenance_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  assigned_staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  assigned_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  next_due_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_work_orders
  DROP CONSTRAINT IF EXISTS maintenance_work_orders_schedule_id_fkey;
ALTER TABLE public.maintenance_work_orders
  ADD CONSTRAINT maintenance_work_orders_schedule_id_fkey
  FOREIGN KEY (schedule_id) REFERENCES public.preventive_maintenance_schedules(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS preventive_maintenance_schedules_due_idx
  ON public.preventive_maintenance_schedules(hotel_id, next_due_at) WHERE active;
CREATE INDEX IF NOT EXISTS preventive_maintenance_schedules_staff_idx
  ON public.preventive_maintenance_schedules(assigned_staff_id, active);

INSERT INTO public.sla_rules (hotel_id, department_id, priority, response_minutes, completion_minutes)
SELECT d.hotel_id, d.id, priorities.priority, priorities.response_minutes, priorities.completion_minutes
FROM public.departments d
CROSS JOIN (VALUES
  ('urgent', 15, 15),
  ('high', 30, 30),
  ('normal', 120, 120),
  ('low', 480, 480)
) AS priorities(priority, response_minutes, completion_minutes)
WHERE d.hotel_id = 'a0000000-0000-0000-0000-000000000001' AND d.name = 'Maintenance'
  AND NOT EXISTS (
    SELECT 1 FROM public.sla_rules existing
    WHERE existing.hotel_id = d.hotel_id AND existing.department_id = d.id
      AND existing.priority = priorities.priority
  );

CREATE OR REPLACE FUNCTION public.is_maintenance_staff(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_auth_links l
    JOIN public.staff_profiles sp ON sp.id = l.staff_id
    LEFT JOIN public.departments d ON d.id = sp.department_id
    WHERE l.user_id = auth.uid() AND sp.hotel_id = p_hotel_id
      AND (sp.role = 'manager' OR d.name = 'Maintenance'
        OR EXISTS (SELECT 1 FROM public.maintenance_eligibility me WHERE me.staff_id = sp.id))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_maintenance_work_order(p_work_order_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.maintenance_work_orders wo
    WHERE wo.id = p_work_order_id
      AND (
        public.is_hotel_manager(wo.hotel_id)
        OR wo.assigned_staff_id = public.current_staff_id()
        OR (public.is_maintenance_staff(wo.hotel_id) AND wo.assigned_staff_id IS NULL)
        OR wo.reported_by_staff_id = public.current_staff_id()
        OR wo.reported_by_guest_id = public.current_guest_id()
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.login_staff(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_staff public.staff_profiles%ROWTYPE;
  v_department text;
BEGIN
  IF auth.uid() IS NULL OR auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'An authenticated session is required';
  END IF;

  SELECT sp.* INTO v_staff
  FROM public.staff_profiles sp
  JOIN public.staff_auth_credentials c ON c.staff_id = sp.id
  WHERE lower(sp.username) = lower(trim(p_username))
    AND c.password_hash = crypt(trim(p_password), c.password_hash)
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  DELETE FROM public.guest_auth_links WHERE user_id = auth.uid();
  INSERT INTO public.staff_auth_links (user_id, staff_id)
  VALUES (auth.uid(), v_staff.id)
  ON CONFLICT (user_id) DO UPDATE SET staff_id = EXCLUDED.staff_id;
  SELECT d.name INTO v_department
  FROM public.departments d WHERE d.id = v_staff.department_id;

  RETURN jsonb_build_object(
    'staffId', v_staff.id,
    'name', concat_ws(' ', v_staff.first_name, v_staff.last_name),
    'role', v_staff.role,
    'department', coalesce(v_department, 'Front Desk'),
    'hotelId', v_staff.hotel_id,
    'housekeepingEligible', EXISTS (
      SELECT 1 FROM public.housekeeping_eligibility he WHERE he.staff_id = v_staff.id
    ),
    'maintenanceEligible', v_staff.role = 'manager' OR EXISTS (
      SELECT 1 FROM public.maintenance_eligibility me WHERE me.staff_id = v_staff.id
    ) OR v_department = 'Maintenance'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_request(
  p_hotel_id uuid,
  p_guest_id uuid,
  p_stay_id uuid,
  p_room_id uuid,
  p_conversation_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_department_name text,
  p_priority text,
  p_source text DEFAULT 'concierge'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_request public.requests%ROWTYPE;
  v_department_id uuid;
  v_actor_type text;
  v_actor_id uuid;
  v_sla_minutes integer;
BEGIN
  IF p_source NOT IN ('concierge', 'staff', 'system')
    OR p_priority NOT IN ('low', 'normal', 'high', 'urgent')
    OR nullif(trim(p_title), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid request source, priority, or title';
  END IF;

  IF public.current_guest_id() = p_guest_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.guest_auth_links gl
      JOIN public.stays s ON s.id = gl.stay_id AND s.guest_id = gl.guest_id
      WHERE gl.user_id = auth.uid() AND gl.stay_id = p_stay_id AND gl.guest_id = p_guest_id
        AND s.room_id = p_room_id AND s.status = 'active'
    ) OR p_source <> 'concierge' THEN
      RAISE EXCEPTION 'Guest can only submit requests for their active stay';
    END IF;
    v_actor_type := 'guest';
    v_actor_id := p_guest_id;
  ELSIF public.is_hotel_staff(p_hotel_id) THEN
    v_actor_type := 'staff';
    v_actor_id := public.current_staff_id();
  ELSE
    RAISE EXCEPTION 'Not authorized to create a request for this hotel';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stays s
    JOIN public.rooms r ON r.id = s.room_id AND r.hotel_id = p_hotel_id
    WHERE s.id = p_stay_id AND s.guest_id = p_guest_id AND s.room_id = p_room_id
  ) THEN
    RAISE EXCEPTION 'Request stay, guest, room, and hotel must match';
  END IF;
  IF p_conversation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = p_conversation_id AND c.guest_id = p_guest_id AND c.stay_id = p_stay_id
  ) THEN
    RAISE EXCEPTION 'Request conversation must belong to the current guest stay';
  END IF;

  SELECT d.id INTO v_department_id
  FROM public.departments d
  WHERE d.hotel_id = p_hotel_id AND d.name = p_department_name;
  SELECT sr.completion_minutes INTO v_sla_minutes
  FROM public.sla_rules sr
  WHERE sr.hotel_id = p_hotel_id AND sr.priority = p_priority
    AND (sr.department_id = v_department_id OR sr.department_id IS NULL)
  ORDER BY (sr.department_id IS NULL), sr.updated_at DESC
  LIMIT 1;

  INSERT INTO public.requests (
    hotel_id, guest_id, stay_id, room_id, conversation_id, department_id,
    title, description, category, status, priority, source, sla_due_at
  )
  VALUES (
    p_hotel_id, p_guest_id, p_stay_id, p_room_id, p_conversation_id, v_department_id,
    trim(p_title), coalesce(p_description, ''), coalesce(p_category, 'Other'), 'new',
    p_priority, p_source, now() + make_interval(mins => coalesce(v_sla_minutes, 60))
  )
  RETURNING * INTO v_request;

  INSERT INTO public.request_events (request_id, actor_type, actor_id, event_type, message)
  VALUES
    (v_request.id, v_actor_type, v_actor_id, 'created', 'Request submitted'),
    (v_request.id, 'assistant', NULL, 'routed', concat('Sent to ', p_department_name));
  RETURN v_request.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_maintenance_work_order_for_request()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_department text;
  v_order_id uuid;
BEGIN
  SELECT d.name INTO v_department FROM public.departments d WHERE d.id = NEW.department_id;
  IF NEW.category <> 'Maintenance' AND coalesce(v_department, '') <> 'Maintenance' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.maintenance_work_orders (
    hotel_id, room_id, request_id, reported_by_type, reported_by_guest_id,
    category, title, description, priority, status, due_at
  )
  VALUES (
    NEW.hotel_id, NEW.room_id, NEW.id, 'guest', NEW.guest_id,
    CASE
      WHEN NEW.title || ' ' || NEW.description ~* 'air.?condition|\\bac\\b|cooling' THEN 'Air Conditioning'
      WHEN NEW.title || ' ' || NEW.description ~* 'sink|leak|toilet|plumb|drain|shower' THEN 'Plumbing'
      WHEN NEW.title || ' ' || NEW.description ~* 'electric|power|socket|outlet|breaker' THEN 'Electrical'
      WHEN NEW.title || ' ' || NEW.description ~* 'light|lamp|bulb' THEN 'Lighting'
      WHEN NEW.title || ' ' || NEW.description ~* 'tv|television|remote|entertainment' THEN 'TV / Entertainment'
      WHEN NEW.title || ' ' || NEW.description ~* 'wi.?fi|internet|network' THEN 'Wi-Fi / Network'
      WHEN NEW.title || ' ' || NEW.description ~* 'bath|tub' THEN 'Bathroom'
      WHEN NEW.title || ' ' || NEW.description ~* 'door|lock|key' THEN 'Door / Lock'
      WHEN NEW.title || ' ' || NEW.description ~* 'furniture|chair|desk|bed' THEN 'Furniture'
      WHEN NEW.title || ' ' || NEW.description ~* 'appliance|fridge|refrigerator|kettle' THEN 'Appliances'
      ELSE 'General Maintenance'
    END,
    NEW.title, NEW.description, NEW.priority, 'reported', NEW.sla_due_at
  )
  ON CONFLICT (request_id) WHERE request_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_order_id;

  IF v_order_id IS NOT NULL THEN
    INSERT INTO public.maintenance_work_order_events (work_order_id, actor_type, actor_id, event_type, message)
    VALUES (v_order_id, 'guest', NEW.guest_id, 'reported', 'Guest maintenance request received');
    INSERT INTO public.room_events (hotel_id, room_id, request_id, actor_type, actor_id, event_type, details)
    VALUES (NEW.hotel_id, NEW.room_id, NEW.id, 'guest', NEW.guest_id, 'maintenance_reported', NEW.title);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_create_maintenance_work_order ON public.requests;
CREATE TRIGGER requests_create_maintenance_work_order
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.create_maintenance_work_order_for_request();

CREATE OR REPLACE FUNCTION public.guard_request_operations_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := public.current_staff_id();
BEGIN
  IF public.is_hotel_manager(OLD.hotel_id) THEN RETURN NEW; END IF;
  IF NOT public.is_hotel_staff(OLD.hotel_id)
    OR (OLD.assigned_staff_id IS NOT NULL AND OLD.assigned_staff_id <> v_staff_id)
    OR (
      OLD.department_id IS DISTINCT FROM (
        SELECT department_id FROM public.staff_profiles WHERE id = v_staff_id
      )
      AND NOT (
        (public.is_housekeeping_staff(OLD.hotel_id) AND OLD.category = 'Housekeeping')
        OR (public.is_maintenance_staff(OLD.hotel_id) AND OLD.category = 'Maintenance')
      )
    ) THEN
    RAISE EXCEPTION 'Not authorized to update this request';
  END IF;
  IF NEW.hotel_id IS DISTINCT FROM OLD.hotel_id
    OR NEW.guest_id IS DISTINCT FROM OLD.guest_id
    OR NEW.stay_id IS DISTINCT FROM OLD.stay_id
    OR NEW.room_id IS DISTINCT FROM OLD.room_id
    OR NEW.department_id IS DISTINCT FROM OLD.department_id
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.priority IS DISTINCT FROM OLD.priority
    OR NEW.source IS DISTINCT FROM OLD.source
    OR NEW.sla_due_at IS DISTINCT FROM OLD.sla_due_at THEN
    RAISE EXCEPTION 'Request identity and routing fields cannot be changed by staff';
  END IF;
  IF NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id
    AND NEW.assigned_staff_id IS DISTINCT FROM v_staff_id THEN
    RAISE EXCEPTION 'Staff may only assign a request to themselves';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
    AND NEW.assigned_staff_id IS DISTINCT FROM v_staff_id THEN
    RAISE EXCEPTION 'Assign the request to yourself before changing its status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.maintenance_work_order_action(
  p_work_order_id uuid,
  p_action text,
  p_note text DEFAULT NULL,
  p_diagnosis text DEFAULT NULL,
  p_resolution text DEFAULT NULL,
  p_parts_materials text DEFAULT NULL,
  p_assigned_staff_id uuid DEFAULT NULL,
  p_room_impact text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.maintenance_work_orders%ROWTYPE;
  v_room public.rooms%ROWTYPE;
  v_staff_id uuid := public.current_staff_id();
  v_is_manager boolean;
  v_is_technician boolean;
  v_actor_type text;
  v_actor_id uuid;
  v_status text;
  v_event text;
  v_message text;
BEGIN
  SELECT * INTO v_order FROM public.maintenance_work_orders WHERE id = p_work_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Maintenance work order not found'; END IF;
  v_is_manager := public.is_hotel_manager(v_order.hotel_id);
  v_is_technician := public.is_maintenance_staff(v_order.hotel_id) AND NOT v_is_manager;
  IF NOT v_is_manager AND NOT v_is_technician THEN
    RAISE EXCEPTION 'Not authorized to access maintenance operations';
  END IF;
  IF v_order.room_id IS NOT NULL THEN
    SELECT * INTO v_room FROM public.rooms WHERE id = v_order.room_id FOR UPDATE;
  END IF;
  IF NOT v_is_manager AND v_order.assigned_staff_id IS DISTINCT FROM v_staff_id THEN
    RAISE EXCEPTION 'Only the assigned technician can update this work order';
  END IF;
  v_actor_type := CASE WHEN v_is_manager THEN 'manager' ELSE 'staff' END;
  v_actor_id := v_staff_id;

  IF p_action IN ('assign', 'reassign', 'unassign') THEN
    IF NOT v_is_manager THEN RAISE EXCEPTION 'Only a manager can assign maintenance work'; END IF;
    IF v_order.status IN ('closed', 'cancelled', 'verified') THEN
      RAISE EXCEPTION 'Closed or verified work orders cannot be assigned';
    END IF;
    IF p_action = 'unassign' THEN
      p_assigned_staff_id := NULL;
    ELSIF NOT EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = p_assigned_staff_id AND sp.hotel_id = v_order.hotel_id AND sp.role = 'staff'
        AND (
          EXISTS (SELECT 1 FROM public.maintenance_eligibility me WHERE me.staff_id = sp.id)
          OR EXISTS (SELECT 1 FROM public.departments d WHERE d.id = sp.department_id AND d.name = 'Maintenance')
        )
    ) THEN
      RAISE EXCEPTION 'Selected technician is not eligible for maintenance';
    END IF;
    IF p_assigned_staff_id IS NOT NULL AND coalesce((
      SELECT status FROM public.staff_availability WHERE staff_id = p_assigned_staff_id
    ), 'available') = 'off_shift' THEN
      RAISE EXCEPTION 'Cannot assign work to staff who are off shift';
    END IF;
    UPDATE public.maintenance_work_orders
    SET assigned_staff_id = p_assigned_staff_id,
      assigned_at = CASE WHEN p_assigned_staff_id IS NULL THEN NULL ELSE now() END,
      status = CASE
        WHEN p_assigned_staff_id IS NULL THEN 'reported'
        WHEN status IN ('reported', 'deferred', 'blocked', 'escalated') THEN 'assigned'
        ELSE status
      END
    WHERE id = p_work_order_id;
    v_event := CASE WHEN p_assigned_staff_id IS NULL THEN 'unassigned'
      WHEN v_order.assigned_staff_id IS NULL THEN 'assigned' ELSE 'reassigned' END;
    v_message := CASE WHEN p_assigned_staff_id IS NULL THEN 'Technician assignment cleared'
      ELSE concat(v_event, ' to ', (SELECT concat_ws(' ', first_name, last_name)
        FROM public.staff_profiles WHERE id = p_assigned_staff_id)) END;
    IF v_order.request_id IS NOT NULL THEN
      UPDATE public.requests SET assigned_staff_id = p_assigned_staff_id,
        assigned_at = CASE WHEN p_assigned_staff_id IS NULL THEN NULL ELSE now() END,
        status = CASE WHEN p_assigned_staff_id IS NULL THEN 'new'
          WHEN status IN ('new', 'escalated') THEN 'assigned' ELSE status END
      WHERE id = v_order.request_id;
    END IF;

  ELSIF p_action = 'acknowledge' THEN
    IF v_is_manager OR v_order.status <> 'assigned' THEN
      RAISE EXCEPTION 'Only the assigned technician can acknowledge an assigned work order';
    END IF;
    v_status := 'acknowledged';
    v_event := 'acknowledged';
    v_message := 'Technician acknowledged the work order';

  ELSIF p_action = 'start_diagnosis' THEN
    IF v_is_manager OR v_order.status NOT IN ('assigned', 'acknowledged') THEN
      RAISE EXCEPTION 'Diagnosis can only start on assigned or acknowledged work';
    END IF;
    v_status := 'diagnosing';
    v_event := 'diagnosis_started';
    v_message := 'Diagnosis started';

  ELSIF p_action = 'save_diagnosis' THEN
    IF v_order.status NOT IN ('diagnosing', 'repair_in_progress')
      OR nullif(trim(p_diagnosis), '') IS NULL THEN
      RAISE EXCEPTION 'Enter a diagnosis while diagnosing or repairing';
    END IF;
    UPDATE public.maintenance_work_orders SET diagnosis = trim(p_diagnosis) WHERE id = p_work_order_id;
    v_event := 'diagnosis_added';
    v_message := trim(p_diagnosis);

  ELSIF p_action = 'start_repair' THEN
    IF v_is_manager OR v_order.status <> 'diagnosing' THEN
      RAISE EXCEPTION 'Repair can only start after diagnosis';
    END IF;
    v_status := 'repair_in_progress';
    v_event := 'repair_started';
    v_message := 'Repair started';

  ELSIF p_action = 'add_note' THEN
    IF nullif(trim(p_note), '') IS NULL THEN RAISE EXCEPTION 'Enter a note'; END IF;
    UPDATE public.maintenance_work_orders
    SET notes = concat_ws(E'\n', notes, trim(p_note)) WHERE id = p_work_order_id;
    v_event := 'note_added';
    v_message := trim(p_note);

  ELSIF p_action = 'complete_repair' THEN
    IF v_is_manager OR v_order.status <> 'repair_in_progress'
      OR nullif(trim(p_resolution), '') IS NULL THEN
      RAISE EXCEPTION 'Only the assigned technician can complete a repair with a resolution';
    END IF;
    UPDATE public.maintenance_work_orders
    SET status = 'verification_required', completed_at = now(),
      resolution = trim(p_resolution),
      parts_materials = coalesce(nullif(trim(p_parts_materials), ''), parts_materials)
    WHERE id = p_work_order_id;
    v_event := 'verification_requested';
    v_message := 'Repair completed; manager verification required';

  ELSIF p_action IN ('blocked', 'defer') THEN
    IF v_order.status IN ('closed', 'cancelled', 'verified') THEN
      RAISE EXCEPTION 'This work order cannot be blocked or deferred';
    END IF;
    v_status := CASE WHEN p_action = 'blocked' THEN 'blocked' ELSE 'deferred' END;
    v_event := v_status;
    v_message := coalesce(nullif(trim(p_note), ''), CASE WHEN p_action = 'blocked' THEN 'Work is blocked' ELSE 'Work deferred' END);
    IF v_order.request_id IS NOT NULL THEN
      UPDATE public.requests SET status = 'escalated' WHERE id = v_order.request_id;
    END IF;

  ELSIF p_action = 'escalate' THEN
    IF NOT v_is_technician OR v_order.status IN ('closed', 'cancelled', 'verified') THEN
      RAISE EXCEPTION 'Only an assigned technician can escalate active work';
    END IF;
    v_status := 'escalated';
    v_event := 'escalated';
    v_message := coalesce(nullif(trim(p_note), ''), 'Technician requested manager assistance');
    IF v_order.request_id IS NOT NULL THEN
      UPDATE public.requests SET status = 'escalated' WHERE id = v_order.request_id;
    END IF;

  ELSIF p_action = 'cancel' THEN
    IF NOT v_is_manager OR v_order.status IN ('closed', 'cancelled') THEN
      RAISE EXCEPTION 'Only a manager can cancel active work';
    END IF;
    v_status := 'cancelled';
    v_event := 'cancelled';
    v_message := coalesce(nullif(trim(p_note), ''), 'Work order cancelled by manager');
    IF v_order.request_id IS NOT NULL THEN
      UPDATE public.requests SET status = 'cancelled' WHERE id = v_order.request_id;
    END IF;

  ELSIF p_action = 'set_room_impact' THEN
    IF NOT v_is_manager OR v_order.room_id IS NULL
      OR p_room_impact NOT IN ('none', 'maintenance', 'out_of_order') THEN
      RAISE EXCEPTION 'Only a manager can set room impact for a room work order';
    END IF;
    IF v_order.status IN ('closed', 'cancelled', 'verified') THEN
      RAISE EXCEPTION 'Room impact cannot be changed on a closed work order';
    END IF;
    IF p_room_impact IN ('maintenance', 'out_of_order') THEN
      UPDATE public.maintenance_work_orders
      SET room_status_before = coalesce(room_status_before, v_room.status),
        room_impact = p_room_impact
      WHERE id = p_work_order_id;
      UPDATE public.rooms SET status = p_room_impact,
        maintenance_issue = concat('Work order ', left(p_work_order_id::text, 8), ': ', v_order.title)
      WHERE id = v_order.room_id;
      IF p_room_impact = 'out_of_order' THEN
        UPDATE public.stays SET status = 'completed', updated_at = now()
        WHERE room_id = v_order.room_id AND status = 'active';
      END IF;
    ELSE
      UPDATE public.maintenance_work_orders SET room_impact = 'none' WHERE id = p_work_order_id;
      IF v_order.room_impact <> 'none' AND v_order.room_status_before IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.maintenance_work_orders other
          WHERE other.room_id = v_order.room_id AND other.id <> p_work_order_id
            AND other.room_impact IN ('maintenance', 'out_of_order')
            AND other.status NOT IN ('closed', 'cancelled')
        ) THEN
        UPDATE public.rooms SET status = v_order.room_status_before, maintenance_issue = NULL
        WHERE id = v_order.room_id;
      END IF;
    END IF;
    v_event := 'room_impact_changed';
    v_message := concat('Room impact set to ', p_room_impact);

  ELSIF p_action = 'verify' THEN
    IF NOT v_is_manager OR v_order.status <> 'verification_required' THEN
      RAISE EXCEPTION 'Only a manager can verify a completed repair';
    END IF;
    UPDATE public.maintenance_work_orders SET status = 'verified', verified_at = now()
    WHERE id = p_work_order_id;
    IF v_order.room_id IS NOT NULL AND v_order.room_impact <> 'none'
      AND v_order.room_status_before IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.maintenance_work_orders other
        WHERE other.room_id = v_order.room_id AND other.id <> p_work_order_id
          AND other.room_impact IN ('maintenance', 'out_of_order')
          AND other.status NOT IN ('closed', 'cancelled', 'verified')
      ) THEN
      UPDATE public.rooms
      SET status = v_order.room_status_before, maintenance_issue = NULL
      WHERE id = v_order.room_id;
    END IF;
    v_event := 'verified';
    v_message := 'Manager verified the repair';
    IF v_order.request_id IS NOT NULL THEN
      UPDATE public.requests SET status = 'completed', completed_at = now()
      WHERE id = v_order.request_id;
    END IF;

  ELSIF p_action = 'close' THEN
    IF NOT v_is_manager OR v_order.status <> 'verified' THEN
      RAISE EXCEPTION 'Only a manager can close verified work';
    END IF;
    v_status := 'closed';
    v_event := 'closed';
    v_message := 'Work order closed';

  ELSIF p_action = 'reopen' THEN
    IF NOT v_is_manager OR v_order.status NOT IN ('verified', 'closed', 'cancelled') THEN
      RAISE EXCEPTION 'Only a manager can reopen a completed or cancelled work order';
    END IF;
    v_status := CASE WHEN v_order.assigned_staff_id IS NULL THEN 'reported' ELSE 'assigned' END;
    v_event := 'reopened';
    v_message := coalesce(nullif(trim(p_note), ''), 'Work order reopened by manager');
    IF v_order.room_id IS NOT NULL AND v_order.room_impact <> 'none' THEN
      UPDATE public.rooms SET status = v_order.room_impact,
        maintenance_issue = concat('Reopened work order ', left(p_work_order_id::text, 8), ': ', v_order.title)
      WHERE id = v_order.room_id;
    END IF;
    IF v_order.request_id IS NOT NULL THEN
      UPDATE public.requests SET status = 'in_progress', completed_at = NULL
      WHERE id = v_order.request_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported maintenance action: %', p_action;
  END IF;

  IF v_status IS NOT NULL THEN
    UPDATE public.maintenance_work_orders SET status = v_status WHERE id = p_work_order_id;
  END IF;
  IF v_event IS NOT NULL THEN
    INSERT INTO public.maintenance_work_order_events (work_order_id, actor_type, actor_id, event_type, message)
    VALUES (p_work_order_id, v_actor_type, v_actor_id, v_event, coalesce(v_message, ''));
    IF v_order.room_id IS NOT NULL THEN
      INSERT INTO public.room_events (hotel_id, room_id, request_id, actor_type, actor_id, event_type, details)
      VALUES (v_order.hotel_id, v_order.room_id, v_order.request_id, v_actor_type, v_actor_id,
        concat('maintenance_', v_event), coalesce(v_message, ''));
    END IF;
    IF v_order.request_id IS NOT NULL THEN
      INSERT INTO public.request_events (request_id, actor_type, actor_id, event_type, message, metadata)
      VALUES (
        v_order.request_id, 'staff', v_staff_id,
        CASE WHEN v_event IN ('assigned', 'reassigned', 'unassigned') THEN 'assigned'
          WHEN v_event = 'escalated' OR v_event = 'blocked' THEN 'escalated'
          WHEN v_event = 'cancelled' THEN 'cancelled'
          WHEN v_event = 'verified' OR v_event = 'closed' THEN 'completed'
          WHEN v_event IN ('diagnosis_started', 'repair_started', 'acknowledged') THEN 'started'
          ELSE 'note' END,
        coalesce(v_message, ''),
        jsonb_build_object('work_order_id', p_work_order_id, 'maintenance_event', v_event)
      );
    END IF;
  END IF;
  RETURN p_work_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_maintenance_work_order(
  p_hotel_id uuid,
  p_room_id uuid,
  p_category text,
  p_title text,
  p_description text,
  p_priority text,
  p_room_impact text DEFAULT 'none'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := public.current_staff_id();
  v_order_id uuid;
  v_due_at timestamptz;
  v_room public.rooms%ROWTYPE;
  v_actor_type text;
BEGIN
  IF NOT public.is_hotel_staff(p_hotel_id) THEN
    RAISE EXCEPTION 'Only hotel staff can create maintenance work';
  END IF;
  IF nullif(trim(p_category), '') IS NULL OR nullif(trim(p_title), '') IS NULL
    OR p_priority NOT IN ('low', 'normal', 'high', 'urgent')
    OR p_room_impact NOT IN ('none', 'maintenance', 'out_of_order') THEN
    RAISE EXCEPTION 'Invalid maintenance work order details';
  END IF;
  IF p_room_impact <> 'none' AND NOT public.is_hotel_manager(p_hotel_id) THEN
    RAISE EXCEPTION 'Only a manager can mark a room as maintenance or out of order';
  END IF;
  IF p_room_id IS NOT NULL THEN
    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id AND hotel_id = p_hotel_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Room does not belong to this hotel'; END IF;
  END IF;

  SELECT now() + make_interval(mins => sr.completion_minutes) INTO v_due_at
  FROM public.sla_rules sr
  JOIN public.departments d ON d.id = sr.department_id AND d.name = 'Maintenance'
  WHERE sr.hotel_id = p_hotel_id AND sr.priority = p_priority
  ORDER BY sr.updated_at DESC LIMIT 1;
  v_actor_type := CASE WHEN public.is_hotel_manager(p_hotel_id) THEN 'manager' ELSE 'staff' END;

  INSERT INTO public.maintenance_work_orders (
    hotel_id, room_id, reported_by_type, reported_by_staff_id, category, title,
    description, priority, status, due_at, room_impact, room_status_before
  )
  VALUES (
    p_hotel_id, p_room_id, 'staff', v_staff_id, trim(p_category), trim(p_title),
    coalesce(p_description, ''), p_priority, 'reported', coalesce(v_due_at, now() + interval '2 hours'),
    p_room_impact, CASE WHEN p_room_impact = 'none' THEN NULL ELSE v_room.status END
  )
  RETURNING id INTO v_order_id;
  INSERT INTO public.maintenance_work_order_events (work_order_id, actor_type, actor_id, event_type, message)
  VALUES (v_order_id, v_actor_type, v_staff_id, 'reported', 'Maintenance work order created');
  IF p_room_id IS NOT NULL THEN
    INSERT INTO public.room_events (hotel_id, room_id, actor_type, actor_id, event_type, details)
    VALUES (p_hotel_id, p_room_id, v_actor_type, v_staff_id, 'maintenance_reported', trim(p_title));
    IF p_room_impact <> 'none' THEN
      UPDATE public.rooms SET status = p_room_impact,
        maintenance_issue = concat('Work order ', left(v_order_id::text, 8), ': ', trim(p_title))
      WHERE id = p_room_id;
    END IF;
  END IF;
  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_maintenance_team(p_hotel_id uuid)
RETURNS TABLE (
  id uuid, first_name text, last_name text, department_name text,
  availability text, active_work_orders bigint, overdue_work_orders bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_hotel_manager(p_hotel_id) THEN
    RAISE EXCEPTION 'Only a hotel manager can view the maintenance team';
  END IF;
  RETURN QUERY
  SELECT sp.id, sp.first_name, sp.last_name, coalesce(d.name, 'Maintenance'),
    coalesce(sa.status, 'available'),
    count(wo.id) FILTER (WHERE wo.status NOT IN ('closed', 'cancelled', 'verified')),
    count(wo.id) FILTER (WHERE wo.status NOT IN ('closed', 'cancelled', 'verified')
      AND wo.due_at < now())
  FROM public.maintenance_eligibility me
  JOIN public.staff_profiles sp ON sp.id = me.staff_id AND sp.hotel_id = me.hotel_id
  LEFT JOIN public.departments d ON d.id = sp.department_id
  LEFT JOIN public.staff_availability sa ON sa.staff_id = sp.id
  LEFT JOIN public.maintenance_work_orders wo ON wo.assigned_staff_id = sp.id
    AND wo.status NOT IN ('closed', 'cancelled', 'verified')
  WHERE me.hotel_id = p_hotel_id AND sp.role = 'staff'
  GROUP BY sp.id, sp.first_name, sp.last_name, d.name, sa.status
  ORDER BY sp.first_name, sp.last_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_preventive_maintenance_schedule(
  p_hotel_id uuid,
  p_room_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_priority text,
  p_frequency text,
  p_next_due_at timestamptz,
  p_assigned_staff_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := public.current_staff_id();
  v_department_id uuid;
  v_schedule_id uuid;
BEGIN
  IF NOT public.is_hotel_manager(p_hotel_id) THEN
    RAISE EXCEPTION 'Only a hotel manager can create preventive maintenance schedules';
  END IF;
  IF nullif(trim(p_title), '') IS NULL OR nullif(trim(p_category), '') IS NULL
    OR p_frequency NOT IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
    OR p_priority NOT IN ('low', 'normal', 'high', 'urgent') OR p_next_due_at IS NULL THEN
    RAISE EXCEPTION 'Invalid preventive maintenance schedule details';
  END IF;
  IF p_room_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rooms r WHERE r.id = p_room_id AND r.hotel_id = p_hotel_id
  ) THEN RAISE EXCEPTION 'Room does not belong to this hotel'; END IF;
  IF p_assigned_staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_eligibility me
    WHERE me.staff_id = p_assigned_staff_id AND me.hotel_id = p_hotel_id
  ) THEN RAISE EXCEPTION 'Selected staff member is not eligible for maintenance'; END IF;
  SELECT id INTO v_department_id FROM public.departments
  WHERE hotel_id = p_hotel_id AND name = 'Maintenance' LIMIT 1;
  INSERT INTO public.preventive_maintenance_schedules (
    hotel_id, room_id, created_by, assigned_staff_id, assigned_department_id,
    title, description, category, priority, frequency, next_due_at
  )
  VALUES (
    p_hotel_id, p_room_id, v_staff_id, p_assigned_staff_id, v_department_id,
    trim(p_title), coalesce(p_description, ''), trim(p_category), p_priority,
    p_frequency, p_next_due_at
  )
  RETURNING id INTO v_schedule_id;
  RETURN v_schedule_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_due_maintenance_work_orders(p_hotel_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule public.preventive_maintenance_schedules%ROWTYPE;
  v_generated integer := 0;
  v_next timestamptz;
  v_order_id uuid;
BEGIN
  IF NOT public.is_hotel_manager(p_hotel_id) THEN
    RAISE EXCEPTION 'Only a hotel manager can generate scheduled maintenance work';
  END IF;
  FOR v_schedule IN
    SELECT * FROM public.preventive_maintenance_schedules
    WHERE hotel_id = p_hotel_id AND active AND next_due_at <= now()
    ORDER BY next_due_at
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.maintenance_work_orders (
      hotel_id, room_id, reported_by_type, assigned_staff_id, category, title,
      description, priority, status, due_at, schedule_id, generated_for
    )
    VALUES (
      v_schedule.hotel_id, v_schedule.room_id, 'system', v_schedule.assigned_staff_id,
      v_schedule.category, v_schedule.title, v_schedule.description, v_schedule.priority,
      CASE WHEN v_schedule.assigned_staff_id IS NULL THEN 'reported' ELSE 'assigned' END,
      v_schedule.next_due_at + interval '1 day', v_schedule.id, v_schedule.next_due_at
    )
    ON CONFLICT (schedule_id, generated_for) WHERE schedule_id IS NOT NULL AND generated_for IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_order_id;
    IF v_order_id IS NOT NULL THEN
      INSERT INTO public.maintenance_work_order_events (work_order_id, actor_type, actor_id, event_type, message)
      VALUES (v_order_id, 'system', NULL, 'preventive_work_generated', 'Preventive maintenance work generated from schedule');
      v_generated := v_generated + 1;
    END IF;

    v_next := v_schedule.next_due_at;
    WHILE v_next <= now() LOOP
      v_next := CASE v_schedule.frequency
        WHEN 'daily' THEN v_next + interval '1 day'
        WHEN 'weekly' THEN v_next + interval '1 week'
        WHEN 'monthly' THEN v_next + interval '1 month'
        WHEN 'quarterly' THEN v_next + interval '3 months'
        WHEN 'yearly' THEN v_next + interval '1 year'
      END;
    END LOOP;
    UPDATE public.preventive_maintenance_schedules
    SET next_due_at = v_next, updated_at = now()
    WHERE id = v_schedule.id;
  END LOOP;
  RETURN v_generated;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_maintenance_attachment(
  p_work_order_id uuid,
  p_storage_path text,
  p_content_type text,
  p_file_size bigint
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.maintenance_work_orders%ROWTYPE;
  v_staff_id uuid := public.current_staff_id();
  v_attachment_id uuid;
BEGIN
  SELECT * INTO v_order FROM public.maintenance_work_orders WHERE id = p_work_order_id;
  IF NOT FOUND OR NOT public.is_maintenance_staff(v_order.hotel_id)
    OR v_order.assigned_staff_id IS DISTINCT FROM v_staff_id THEN
    RAISE EXCEPTION 'Only the assigned maintenance technician can attach work order photos';
  END IF;
  IF p_storage_path !~ ('^' || p_work_order_id::text || '/')
    OR p_file_size <= 0 OR p_file_size > 10485760
    OR p_content_type NOT IN ('image/jpeg', 'image/png', 'image/webp') THEN
    RAISE EXCEPTION 'Photo must be a JPEG, PNG, or WebP file up to 10 MB';
  END IF;
  INSERT INTO public.maintenance_attachments (work_order_id, storage_path, content_type, file_size, uploaded_by)
  VALUES (p_work_order_id, p_storage_path, p_content_type, p_file_size, v_staff_id)
  RETURNING id INTO v_attachment_id;
  INSERT INTO public.maintenance_work_order_events (work_order_id, actor_type, actor_id, event_type, message)
  VALUES (p_work_order_id, 'staff', v_staff_id, 'photo_added', 'Repair photo attached');
  RETURN v_attachment_id;
END;
$$;

ALTER TABLE public.maintenance_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_work_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventive_maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY maintenance_eligibility_read ON public.maintenance_eligibility
FOR SELECT TO authenticated
USING (public.is_hotel_manager(hotel_id) OR staff_id = public.current_staff_id());
CREATE POLICY maintenance_work_orders_read ON public.maintenance_work_orders
FOR SELECT TO authenticated
USING (public.can_access_maintenance_work_order(id));
CREATE POLICY maintenance_work_order_events_read ON public.maintenance_work_order_events
FOR SELECT TO authenticated
USING (public.can_access_maintenance_work_order(work_order_id));
CREATE POLICY maintenance_attachments_read ON public.maintenance_attachments
FOR SELECT TO authenticated
USING (public.can_access_maintenance_work_order(work_order_id));
CREATE POLICY preventive_maintenance_schedules_read ON public.preventive_maintenance_schedules
FOR SELECT TO authenticated
USING (public.is_hotel_manager(hotel_id) OR public.is_maintenance_staff(hotel_id));

DROP POLICY IF EXISTS authenticated_requests_read ON public.requests;
CREATE POLICY authenticated_requests_read ON public.requests FOR SELECT TO authenticated
USING (
  guest_id = public.current_guest_id()
  OR public.is_hotel_manager(hotel_id)
  OR assigned_staff_id = public.current_staff_id()
  OR (
    public.is_hotel_staff(hotel_id)
    AND (
      department_id = public.current_staff_department_id()
      OR (public.is_housekeeping_staff(hotel_id) AND category = 'Housekeeping')
      OR (public.is_maintenance_staff(hotel_id) AND category = 'Maintenance')
    )
  )
);

DROP POLICY IF EXISTS authenticated_requests_update ON public.requests;
CREATE POLICY authenticated_requests_update ON public.requests FOR UPDATE TO authenticated
USING (
  public.is_hotel_manager(hotel_id)
  OR assigned_staff_id = public.current_staff_id()
  OR (
    public.is_hotel_staff(hotel_id)
    AND (
      department_id = public.current_staff_department_id()
      OR (public.is_housekeeping_staff(hotel_id) AND category = 'Housekeeping')
      OR (public.is_maintenance_staff(hotel_id) AND category = 'Maintenance')
    )
  )
)
WITH CHECK (
  public.is_hotel_manager(hotel_id)
  OR assigned_staff_id = public.current_staff_id()
  OR (
    public.is_hotel_staff(hotel_id)
    AND (
      department_id = public.current_staff_department_id()
      OR (public.is_housekeeping_staff(hotel_id) AND category = 'Housekeeping')
      OR (public.is_maintenance_staff(hotel_id) AND category = 'Maintenance')
    )
  )
);

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('maintenance-private', 'maintenance-private', false, 10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp'])
  ON CONFLICT (id) DO UPDATE
    SET public = false, file_size_limit = 10485760,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
END;
$$;

CREATE POLICY maintenance_photo_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'maintenance-private'
  AND public.can_access_maintenance_work_order(((storage.foldername(name))[1])::uuid)
);
CREATE POLICY maintenance_photo_upload ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-private'
  AND public.can_access_maintenance_work_order(((storage.foldername(name))[1])::uuid)
  AND EXISTS (
    SELECT 1 FROM public.maintenance_work_orders wo
    WHERE wo.id = ((storage.foldername(name))[1])::uuid
      AND wo.assigned_staff_id = public.current_staff_id()
      AND public.is_maintenance_staff(wo.hotel_id)
  )
);

REVOKE ALL ON public.maintenance_eligibility, public.maintenance_work_orders,
  public.maintenance_work_order_events, public.maintenance_attachments,
  public.preventive_maintenance_schedules FROM anon, authenticated;
GRANT SELECT ON public.maintenance_eligibility, public.maintenance_work_orders,
  public.maintenance_work_order_events, public.maintenance_attachments,
  public.preventive_maintenance_schedules TO authenticated;

REVOKE ALL ON FUNCTION public.maintenance_work_order_action(uuid, text, text, text, text, text, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_maintenance_work_order(uuid, uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_maintenance_team(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_preventive_maintenance_schedule(uuid, uuid, text, text, text, text, text, timestamptz, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_due_maintenance_work_orders(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.register_maintenance_attachment(uuid, text, text, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.maintenance_work_order_action(uuid, text, text, text, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_maintenance_work_order(uuid, uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_maintenance_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_preventive_maintenance_schedule(uuid, uuid, text, text, text, text, text, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_due_maintenance_work_orders(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_maintenance_attachment(uuid, text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.login_staff(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_request(uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text) TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_work_orders;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_work_order_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.preventive_maintenance_schedules;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
DECLARE
  v_hotel_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_tech_id uuid;
  v_room_408 uuid;
  v_room_317 uuid;
  v_room_224 uuid;
  v_room_501 uuid;
  v_order_id uuid;
BEGIN
  SELECT id INTO v_tech_id FROM public.staff_profiles
  WHERE hotel_id = v_hotel_id AND username = 'staff2' AND role = 'staff';
  SELECT id INTO v_room_408 FROM public.rooms WHERE hotel_id = v_hotel_id AND room_number = '408';
  SELECT id INTO v_room_317 FROM public.rooms WHERE hotel_id = v_hotel_id AND room_number = '317';
  SELECT id INTO v_room_224 FROM public.rooms WHERE hotel_id = v_hotel_id AND room_number = '224';
  SELECT id INTO v_room_501 FROM public.rooms WHERE hotel_id = v_hotel_id AND room_number = '501';

  IF v_tech_id IS NULL THEN RETURN; END IF;

  IF v_room_408 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_work_orders WHERE room_id = v_room_408
      AND category = 'Air Conditioning' AND status NOT IN ('closed', 'cancelled')
  ) THEN
    INSERT INTO public.maintenance_work_orders (
      hotel_id, room_id, reported_by_type, assigned_staff_id, category, title,
      description, priority, status, due_at, assigned_at, created_at
    )
    VALUES (v_hotel_id, v_room_408, 'system', v_tech_id, 'Air Conditioning',
      'Air conditioning not cooling', 'Guest reports the AC is running but not cooling the room.',
      'high', 'assigned', now() + interval '30 minutes', now(), now())
    RETURNING id INTO v_order_id;
    INSERT INTO public.maintenance_work_order_events (work_order_id, actor_type, event_type, message)
    VALUES (v_order_id, 'system', 'assigned', 'Demo maintenance work assigned to Daniel');
    INSERT INTO public.maintenance_work_orders (
      hotel_id, room_id, reported_by_type, category, title, description, priority, status, created_at, completed_at, verified_at, closed_at
    )
    VALUES
      (v_hotel_id, v_room_408, 'system', 'Air Conditioning', 'Previous AC fan issue',
       'Fan motor noise investigated and corrected.', 'normal', 'closed', now() - interval '23 days',
       now() - interval '23 days' + interval '1 hour', now() - interval '23 days' + interval '2 hours',
       now() - interval '23 days' + interval '2 hours'),
      (v_hotel_id, v_room_408, 'system', 'Air Conditioning', 'Previous AC cooling issue',
       'Cooling output restored after service.', 'normal', 'closed', now() - interval '12 days',
       now() - interval '12 days' + interval '1 hour', now() - interval '12 days' + interval '2 hours',
       now() - interval '12 days' + interval '2 hours');
  END IF;

  IF v_room_317 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_work_orders WHERE room_id = v_room_317 AND title = 'Bathroom sink leak'
  ) THEN
    INSERT INTO public.maintenance_work_orders (
      hotel_id, room_id, reported_by_type, category, title, description, priority, status, due_at
    )
    VALUES (v_hotel_id, v_room_317, 'system', 'Plumbing', 'Bathroom sink leak',
      'Water leaking from the sink drain connection.', 'urgent', 'reported', now() + interval '15 minutes')
    RETURNING id INTO v_order_id;
    INSERT INTO public.maintenance_work_order_events (work_order_id, actor_type, event_type, message)
    VALUES (v_order_id, 'system', 'reported', 'Demo urgent work order');
  END IF;

  IF v_room_224 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_work_orders WHERE room_id = v_room_224 AND title = 'Television not working'
  ) THEN
    INSERT INTO public.maintenance_work_orders (
      hotel_id, room_id, reported_by_type, assigned_staff_id, category, title,
      description, priority, status, due_at, assigned_at, started_at, diagnosed_at
    )
    VALUES (v_hotel_id, v_room_224, 'system', v_tech_id, 'TV / Entertainment',
      'Television not working', 'Television does not power on with the room remote.',
      'normal', 'repair_in_progress', now() + interval '2 hours', now() - interval '20 minutes',
      now() - interval '10 minutes', now() - interval '15 minutes')
    RETURNING id INTO v_order_id;
    INSERT INTO public.maintenance_work_order_events (work_order_id, actor_type, event_type, message)
    VALUES (v_order_id, 'system', 'repair_started', 'Demo repair in progress');
  END IF;

  IF v_room_501 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_work_orders WHERE room_id = v_room_501 AND title = 'Light fixture issue'
  ) THEN
    INSERT INTO public.maintenance_work_orders (
      hotel_id, room_id, reported_by_type, assigned_staff_id, category, title,
      description, priority, status, due_at, assigned_at, started_at, diagnosed_at, completed_at, resolution
    )
    VALUES (v_hotel_id, v_room_501, 'system', v_tech_id, 'Lighting',
      'Light fixture issue', 'Bedside light intermittently flickers.',
      'normal', 'verification_required', now(), now() - interval '45 minutes',
      now() - interval '40 minutes', now() - interval '35 minutes', now() - interval '5 minutes',
      'Replaced the bulb and tested the fixture; manager verification required.')
    RETURNING id INTO v_order_id;
    INSERT INTO public.maintenance_work_order_events (work_order_id, actor_type, event_type, message)
    VALUES (v_order_id, 'system', 'verification_requested', 'Demo repair awaits manager verification');
  END IF;
END;
$$;
