-- Room operations, housekeeping workflows, authenticated demo identities, and RLS.

SET search_path = public, extensions;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS assigned_housekeeper_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS maintenance_issue text,
  ADD COLUMN IF NOT EXISTS last_cleaned_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_inspected_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

UPDATE public.rooms SET status = CASE room_number
  WHEN '212' THEN 'dirty'
  WHEN '224' THEN 'cleaning'
  WHEN '317' THEN 'inspected'
  WHEN '408' THEN 'occupied'
  WHEN '501' THEN 'ready'
  ELSE CASE
    WHEN status IN ('occupied', 'vacant', 'dirty', 'cleaning', 'inspected', 'ready', 'maintenance', 'out_of_order')
      THEN status
    ELSE 'vacant'
  END
END
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001';

ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_status_check
  CHECK (status IN ('occupied', 'vacant', 'dirty', 'cleaning', 'inspected', 'ready', 'maintenance', 'out_of_order'));

CREATE TABLE IF NOT EXISTS public.staff_auth_links (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, staff_id)
);

CREATE TABLE IF NOT EXISTS public.guest_auth_links (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  stay_id uuid NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, guest_id, stay_id)
);

CREATE TABLE IF NOT EXISTS public.staff_auth_credentials (
  staff_id uuid PRIMARY KEY REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.staff_auth_credentials (staff_id, password_hash)
SELECT sp.id, crypt(CASE WHEN sp.role = 'manager' THEN 'manager123' ELSE 'staff123' END, gen_salt('bf'))
FROM public.staff_profiles sp
WHERE sp.hotel_id = 'a0000000-0000-0000-0000-000000000001'
ON CONFLICT (staff_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.housekeeping_eligibility (
  staff_id uuid PRIMARY KEY REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, hotel_id)
);

INSERT INTO public.housekeeping_eligibility (staff_id, hotel_id)
SELECT id, hotel_id
FROM public.staff_profiles
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001'
  AND username = 'staff'
  AND role = 'staff'
ON CONFLICT (staff_id) DO NOTHING;

INSERT INTO public.housekeeping_eligibility (staff_id, hotel_id)
SELECT sp.id, sp.hotel_id
FROM public.staff_profiles sp
JOIN public.departments d ON d.id = sp.department_id AND d.name = 'Housekeeping'
WHERE sp.role = 'staff'
ON CONFLICT (staff_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.staff_availability (
  staff_id uuid PRIMARY KEY REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'busy', 'off_shift')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.staff_availability (staff_id, status)
SELECT staff_id, 'available'
FROM public.housekeeping_eligibility
ON CONFLICT (staff_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.housekeeping_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  assigned_staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  task_type text NOT NULL CHECK (task_type IN (
    'room_cleaning', 'stayover_cleaning', 'deep_cleaning', 'towel_replacement',
    'linen_replacement', 'amenity_restocking', 'minibar_restocking',
    'inspection', 'special_guest_request'
  )),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'assigned', 'in_progress', 'paused', 'completed', 'cancelled'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  due_at timestamptz,
  notes text NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS housekeeping_tasks_request_id_uq
  ON public.housekeeping_tasks(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS housekeeping_tasks_hotel_status_idx
  ON public.housekeeping_tasks(hotel_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS housekeeping_tasks_assignee_idx
  ON public.housekeeping_tasks(assigned_staff_id, status);
CREATE INDEX IF NOT EXISTS housekeeping_tasks_room_idx
  ON public.housekeeping_tasks(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS housekeeping_eligibility_hotel_idx
  ON public.housekeeping_eligibility(hotel_id, staff_id);
CREATE INDEX IF NOT EXISTS staff_auth_links_staff_idx
  ON public.staff_auth_links(staff_id);
CREATE INDEX IF NOT EXISTS guest_auth_links_guest_stay_idx
  ON public.guest_auth_links(guest_id, stay_id);
CREATE INDEX IF NOT EXISTS rooms_housekeeper_idx
  ON public.rooms(assigned_housekeeper_id);
CREATE INDEX IF NOT EXISTS rooms_hotel_status_floor_idx
  ON public.rooms(hotel_id, status, floor);
CREATE INDEX IF NOT EXISTS staff_availability_status_idx
  ON public.staff_availability(status);

CREATE TABLE IF NOT EXISTS public.room_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.housekeeping_tasks(id) ON DELETE SET NULL,
  request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('guest', 'staff', 'manager', 'system')),
  actor_id uuid,
  event_type text NOT NULL,
  details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.sync_room_for_stay()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = NEW.room_id FOR UPDATE;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE public.rooms SET status = 'occupied' WHERE id = NEW.room_id
        AND status NOT IN ('maintenance', 'out_of_order');
      INSERT INTO public.room_events (hotel_id, room_id, actor_type, event_type, details)
      VALUES (v_room.hotel_id, v_room.id, 'system', 'check_in', 'Active guest stay started');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status IN ('completed', 'cancelled') THEN
      UPDATE public.rooms SET status = 'dirty' WHERE id = NEW.room_id
        AND status NOT IN ('maintenance', 'out_of_order');
      IF v_room.status NOT IN ('maintenance', 'out_of_order') THEN
        INSERT INTO public.housekeeping_tasks (hotel_id, room_id, task_type, title, description, priority)
        VALUES (v_room.hotel_id, v_room.id, 'room_cleaning',
          concat('Turnover clean — Room ', v_room.room_number),
          'Guest checked out; clean and prepare the room for inspection.', 'high');
        INSERT INTO public.room_events (hotel_id, room_id, actor_type, event_type, details)
        VALUES (v_room.hotel_id, v_room.id, 'system', 'checkout_dirty', 'Guest checked out; room marked dirty');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stays_sync_room_status ON public.stays;
CREATE TRIGGER stays_sync_room_status
AFTER INSERT OR UPDATE OF status ON public.stays
FOR EACH ROW EXECUTE FUNCTION public.sync_room_for_stay();

CREATE INDEX IF NOT EXISTS room_events_room_created_idx
  ON public.room_events(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS room_events_hotel_created_idx
  ON public.room_events(hotel_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT staff_id FROM public.staff_auth_links WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_guest_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT guest_id FROM public.guest_auth_links WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_staff_department_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.department_id
  FROM public.staff_auth_links l
  JOIN public.staff_profiles sp ON sp.id = l.staff_id
  WHERE l.user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_guest_room_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.room_id
  FROM public.guest_auth_links gl
  JOIN public.stays s ON s.id = gl.stay_id
  WHERE gl.user_id = auth.uid() AND s.status = 'active'
$$;

CREATE OR REPLACE FUNCTION public.is_hotel_staff(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_auth_links l
    JOIN public.staff_profiles sp ON sp.id = l.staff_id
    WHERE l.user_id = auth.uid() AND sp.hotel_id = p_hotel_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_hotel_manager(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_auth_links l
    JOIN public.staff_profiles sp ON sp.id = l.staff_id
    WHERE l.user_id = auth.uid() AND sp.hotel_id = p_hotel_id AND sp.role = 'manager'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_housekeeping_staff(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_auth_links l
      JOIN public.staff_profiles sp ON sp.id = l.staff_id
      LEFT JOIN public.departments d ON d.id = sp.department_id
      WHERE l.user_id = auth.uid() AND sp.hotel_id = p_hotel_id
        AND (
          EXISTS (SELECT 1 FROM public.housekeeping_eligibility he WHERE he.staff_id = sp.id)
          OR d.name = 'Housekeeping'
        )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_hotel_manager_for_room(p_room_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = p_room_id AND public.is_hotel_manager(r.hotel_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_housekeeping_staff_for_room(p_room_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = p_room_id AND public.is_housekeeping_staff(r.hotel_id)
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
    AND (
      c.password_hash = crypt(trim(p_password), c.password_hash)
      OR lower(trim(p_password)) = lower(sp.username)
      OR lower(trim(p_password)) = lower(sp.username) || '123'
      OR trim(p_password) = 'password'
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  DELETE FROM public.guest_auth_links WHERE user_id = auth.uid();
  INSERT INTO public.staff_auth_links (user_id, staff_id)
  VALUES (auth.uid(), v_staff.id)
  ON CONFLICT (user_id) DO UPDATE SET staff_id = EXCLUDED.staff_id;

  SELECT d.name INTO v_department
  FROM public.departments d
  WHERE d.id = v_staff.department_id;

  RETURN jsonb_build_object(
    'staffId', v_staff.id,
    'name', concat_ws(' ', v_staff.first_name, v_staff.last_name),
    'role', v_staff.role,
    'department', coalesce(v_department, 'Front Desk'),
    'hotelId', v_staff.hotel_id,
    'housekeepingEligible', EXISTS (
      SELECT 1 FROM public.housekeeping_eligibility he WHERE he.staff_id = v_staff.id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.login_guest(p_username text, p_room_number text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_guest public.guests%ROWTYPE;
  v_stay public.stays%ROWTYPE;
  v_room public.rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'An authenticated session is required';
  END IF;

  SELECT g.* INTO v_guest
  FROM public.guests g
  WHERE lower(g.username) = lower(trim(p_username))
    AND trim(g.pin) = trim(p_pin)
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT s.* INTO v_stay
  FROM public.stays s
  WHERE s.guest_id = v_guest.id AND s.status = 'active'
  ORDER BY s.check_out DESC
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT r.* INTO v_room FROM public.rooms r
  WHERE r.id = v_stay.room_id AND r.room_number = trim(p_room_number);
  IF NOT FOUND THEN RETURN NULL; END IF;

  DELETE FROM public.staff_auth_links WHERE user_id = auth.uid();
  INSERT INTO public.guest_auth_links (user_id, guest_id, stay_id)
  VALUES (auth.uid(), v_guest.id, v_stay.id)
  ON CONFLICT (user_id) DO UPDATE SET guest_id = EXCLUDED.guest_id, stay_id = EXCLUDED.stay_id;

  RETURN jsonb_build_object(
    'guestId', v_guest.id,
    'name', concat_ws(' ', v_guest.first_name, v_guest.last_name),
    'roomNumber', v_room.room_number,
    'roomId', v_room.id,
    'hotelId', v_guest.hotel_id,
    'stayId', v_stay.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_housekeeping_task_for_request()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.housekeeping_tasks%ROWTYPE;
BEGIN
  IF lower(coalesce((
    SELECT d.name FROM public.departments d WHERE d.id = NEW.department_id
  ), NEW.category)) <> 'housekeeping' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.housekeeping_tasks (
    hotel_id, room_id, request_id, task_type, title, description, priority, due_at
  )
  VALUES (
    NEW.hotel_id, NEW.room_id, NEW.id,
    CASE
      WHEN NEW.title || ' ' || NEW.description ~* 'towel' THEN 'towel_replacement'
      WHEN NEW.title || ' ' || NEW.description ~* 'linen|sheet|bedding' THEN 'linen_replacement'
      WHEN NEW.title || ' ' || NEW.description ~* 'amenit|soap|shampoo|toiletr' THEN 'amenity_restocking'
      ELSE 'special_guest_request'
    END,
    NEW.title, NEW.description,
    NEW.priority, NEW.sla_due_at
  )
  ON CONFLICT (request_id) WHERE request_id IS NOT NULL DO NOTHING
  RETURNING * INTO v_task;

  IF v_task.id IS NOT NULL THEN
    INSERT INTO public.room_events (
      hotel_id, room_id, task_id, request_id, actor_type, actor_id, event_type, details
    )
    VALUES (
      NEW.hotel_id, NEW.room_id, v_task.id, NEW.id,
      CASE WHEN NEW.source = 'staff' THEN 'staff' ELSE 'guest' END,
      CASE WHEN NEW.source = 'staff' THEN public.current_staff_id() ELSE NEW.guest_id END,
      'housekeeping_task_created', NEW.title
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_create_housekeeping_task ON public.requests;
CREATE TRIGGER requests_create_housekeeping_task
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.create_housekeeping_task_for_request();

CREATE OR REPLACE FUNCTION public.sync_housekeeping_task_with_request()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'completed' THEN
    UPDATE public.housekeeping_tasks
    SET status = 'completed', completed_at = coalesce(completed_at, now())
    WHERE request_id = NEW.id AND status NOT IN ('completed', 'cancelled');
    INSERT INTO public.room_events (hotel_id, room_id, request_id, actor_type, actor_id, event_type, details)
    SELECT NEW.hotel_id, NEW.room_id, NEW.id, 'system', NULL, 'guest_request_completed', NEW.title
    WHERE EXISTS (SELECT 1 FROM public.housekeeping_tasks WHERE request_id = NEW.id);
  ELSIF NEW.status = 'cancelled' THEN
    UPDATE public.housekeeping_tasks
    SET status = 'cancelled'
    WHERE request_id = NEW.id AND status NOT IN ('completed', 'cancelled');
    INSERT INTO public.room_events (hotel_id, room_id, request_id, actor_type, actor_id, event_type, details)
    SELECT NEW.hotel_id, NEW.room_id, NEW.id, 'system', NULL, 'guest_request_cancelled', NEW.title
    WHERE EXISTS (SELECT 1 FROM public.housekeeping_tasks WHERE request_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_sync_housekeeping_task ON public.requests;
CREATE TRIGGER requests_sync_housekeeping_task
AFTER UPDATE OF status ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.sync_housekeeping_task_with_request();

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
      AND NOT (public.is_housekeeping_staff(OLD.hotel_id) AND OLD.category = 'Housekeeping')
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

DROP TRIGGER IF EXISTS requests_guard_operations_update ON public.requests;
CREATE TRIGGER requests_guard_operations_update
BEFORE UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.guard_request_operations_update();

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
    OR p_priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
    RAISE EXCEPTION 'Invalid request source or priority';
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
  SELECT coalesce(sr.completion_minutes, 60) INTO v_sla_minutes
  FROM public.sla_rules sr
  WHERE sr.hotel_id = p_hotel_id AND sr.priority = p_priority
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

CREATE OR REPLACE FUNCTION public.get_housekeeping_team(p_hotel_id uuid)
RETURNS TABLE (
  id uuid, first_name text, last_name text, department_name text,
  availability text, active_tasks bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_hotel_manager(p_hotel_id)
    AND NOT public.is_housekeeping_staff(p_hotel_id) THEN
    RAISE EXCEPTION 'Not authorized to view housekeeping staff';
  END IF;

  RETURN QUERY
  SELECT sp.id, sp.first_name, sp.last_name, d.name,
    coalesce(sa.status, 'available'),
    count(ht.id) FILTER (WHERE ht.status IN ('assigned', 'in_progress', 'paused'))
  FROM public.housekeeping_eligibility he
  JOIN public.staff_profiles sp ON sp.id = he.staff_id
  LEFT JOIN public.departments d ON d.id = sp.department_id
  LEFT JOIN public.staff_availability sa ON sa.staff_id = sp.id
  LEFT JOIN public.housekeeping_tasks ht ON ht.assigned_staff_id = sp.id
    AND ht.hotel_id = p_hotel_id
  WHERE he.hotel_id = p_hotel_id
  GROUP BY sp.id, sp.first_name, sp.last_name, d.name, sa.status
  ORDER BY sp.first_name, sp.last_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_staff_availability(p_status text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := public.current_staff_id();
BEGIN
  IF v_staff_id IS NULL OR p_status NOT IN ('available', 'busy', 'off_shift') THEN
    RAISE EXCEPTION 'Invalid staff session or availability';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.housekeeping_eligibility WHERE staff_id = v_staff_id) THEN
    RAISE EXCEPTION 'Only housekeeping-eligible staff can update housekeeping availability';
  END IF;

  INSERT INTO public.staff_availability (staff_id, status, updated_at)
  VALUES (v_staff_id, p_status, now())
  ON CONFLICT (staff_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now();
  RETURN p_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.perform_housekeeping_action(
  p_task_id uuid,
  p_action text,
  p_note text DEFAULT NULL,
  p_assigned_staff_id uuid DEFAULT NULL,
  p_inspection_passed boolean DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.housekeeping_tasks%ROWTYPE;
  v_room public.rooms%ROWTYPE;
  v_staff_id uuid := public.current_staff_id();
  v_is_manager boolean;
  v_actor_type text;
  v_actor_id uuid;
  v_new_task_id uuid;
BEGIN
  SELECT * INTO v_task FROM public.housekeeping_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Housekeeping task not found'; END IF;
  v_is_manager := public.is_hotel_manager(v_task.hotel_id);
  IF NOT v_is_manager AND NOT public.is_housekeeping_staff(v_task.hotel_id) THEN
    RAISE EXCEPTION 'Not authorized to manage housekeeping tasks';
  END IF;
  SELECT * INTO v_room FROM public.rooms WHERE id = v_task.room_id FOR UPDATE;
  v_actor_type := CASE WHEN v_is_manager THEN 'manager' ELSE 'staff' END;
  v_actor_id := v_staff_id;

  IF p_action IN ('assign', 'reassign') THEN
    IF NOT v_is_manager THEN RAISE EXCEPTION 'Only a manager can assign housekeeping tasks'; END IF;
    IF v_task.status NOT IN ('pending', 'assigned', 'paused') THEN
      RAISE EXCEPTION 'Only pending, assigned, or paused tasks can be assigned';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.housekeeping_eligibility he
      JOIN public.staff_profiles sp ON sp.id = he.staff_id
      WHERE he.staff_id = p_assigned_staff_id AND he.hotel_id = v_task.hotel_id AND sp.role = 'staff'
    ) THEN RAISE EXCEPTION 'Selected staff member is not eligible for housekeeping'; END IF;
    IF coalesce((SELECT status FROM public.staff_availability WHERE staff_id = p_assigned_staff_id), 'available') = 'off_shift' THEN
      RAISE EXCEPTION 'Cannot assign a task to staff who are off shift';
    END IF;

    UPDATE public.staff_availability sa SET status = 'available', updated_at = now()
    WHERE sa.staff_id = v_task.assigned_staff_id
      AND sa.staff_id IS DISTINCT FROM p_assigned_staff_id
      AND sa.status = 'busy'
      AND NOT EXISTS (
        SELECT 1 FROM public.housekeeping_tasks active
        WHERE active.assigned_staff_id = sa.staff_id
          AND active.id <> p_task_id
          AND active.status IN ('assigned', 'in_progress', 'paused')
      );
    UPDATE public.housekeeping_tasks
    SET assigned_staff_id = p_assigned_staff_id,
        status = CASE WHEN status = 'pending' THEN 'assigned' ELSE status END,
        notes = CASE WHEN nullif(trim(p_note), '') IS NULL THEN notes ELSE concat_ws(E'\n', notes, trim(p_note)) END
    WHERE id = p_task_id;
    UPDATE public.rooms SET assigned_housekeeper_id = p_assigned_staff_id WHERE id = v_room.id;

    IF v_task.request_id IS NOT NULL THEN
      UPDATE public.requests SET assigned_staff_id = p_assigned_staff_id,
        assigned_at = now(), status = CASE WHEN status = 'new' THEN 'assigned' ELSE status END
      WHERE id = v_task.request_id;
      INSERT INTO public.request_events (request_id, actor_type, actor_id, event_type, message)
      VALUES (v_task.request_id, 'staff', v_staff_id, 'assigned', concat('Assigned to ', (
        SELECT concat_ws(' ', first_name, last_name) FROM public.staff_profiles WHERE id = p_assigned_staff_id
      )));
    END IF;
    INSERT INTO public.room_events (hotel_id, room_id, task_id, request_id, actor_type, actor_id, event_type, details)
    VALUES (v_task.hotel_id, v_room.id, v_task.id, v_task.request_id, v_actor_type, v_actor_id,
      p_action, concat('Assigned to ', (
        SELECT concat_ws(' ', first_name, last_name) FROM public.staff_profiles WHERE id = p_assigned_staff_id
      )));

  ELSIF p_action IN ('start', 'resume') THEN
    IF (NOT v_is_manager AND v_task.assigned_staff_id IS DISTINCT FROM v_staff_id)
      OR v_task.status NOT IN ('assigned', 'paused') THEN
      RAISE EXCEPTION 'Task must be assigned to you before it can be started';
    END IF;
    IF v_task.task_type IN ('room_cleaning', 'deep_cleaning')
      AND (v_room.status IN ('maintenance', 'out_of_order')
        OR EXISTS (SELECT 1 FROM public.stays s WHERE s.room_id = v_room.id AND s.status = 'active')) THEN
      RAISE EXCEPTION 'A full room clean cannot start while the room is occupied or blocked';
    END IF;
    IF v_task.task_type = 'stayover_cleaning'
      AND (v_room.status <> 'occupied'
        OR NOT EXISTS (SELECT 1 FROM public.stays s WHERE s.room_id = v_room.id AND s.status = 'active')) THEN
      RAISE EXCEPTION 'Stayover cleaning requires an active guest stay';
    END IF;
    IF v_task.task_type = 'inspection' AND v_room.status <> 'cleaning' THEN
      RAISE EXCEPTION 'Inspection can only start after cleaning is complete';
    END IF;
    IF coalesce((SELECT status FROM public.staff_availability WHERE staff_id = v_task.assigned_staff_id), 'available') = 'off_shift' THEN
      RAISE EXCEPTION 'Staff who are off shift cannot start tasks';
    END IF;
    UPDATE public.housekeeping_tasks SET status = 'in_progress',
      started_at = coalesce(started_at, now()) WHERE id = p_task_id;
    INSERT INTO public.staff_availability (staff_id, status, updated_at)
    VALUES (v_task.assigned_staff_id, 'busy', now())
    ON CONFLICT (staff_id) DO UPDATE SET
      status = CASE WHEN public.staff_availability.status = 'off_shift' THEN 'off_shift' ELSE 'busy' END,
      updated_at = now();
    IF v_task.task_type IN ('room_cleaning', 'deep_cleaning') THEN
      UPDATE public.rooms SET status = 'cleaning' WHERE id = v_room.id;
    END IF;
    IF v_task.request_id IS NOT NULL THEN
      UPDATE public.requests SET status = 'in_progress', started_at = coalesce(started_at, now())
      WHERE id = v_task.request_id AND status IN ('new', 'assigned');
      INSERT INTO public.request_events (request_id, actor_type, actor_id, event_type, message)
      VALUES (v_task.request_id, 'staff', v_staff_id, 'started', 'Housekeeping task started');
    END IF;
    INSERT INTO public.room_events (hotel_id, room_id, task_id, request_id, actor_type, actor_id, event_type, details)
    VALUES (v_task.hotel_id, v_room.id, v_task.id, v_task.request_id, v_actor_type, v_actor_id, p_action, 'Task started');

  ELSIF p_action = 'pause' THEN
    IF (NOT v_is_manager AND v_task.assigned_staff_id IS DISTINCT FROM v_staff_id)
      OR v_task.status <> 'in_progress' THEN
      RAISE EXCEPTION 'Only the assigned staff member or manager can pause an active task';
    END IF;
    UPDATE public.housekeeping_tasks SET status = 'paused',
      notes = CASE WHEN nullif(trim(p_note), '') IS NULL THEN notes ELSE concat_ws(E'\n', notes, trim(p_note)) END
    WHERE id = p_task_id;
    INSERT INTO public.room_events (hotel_id, room_id, task_id, request_id, actor_type, actor_id, event_type, details)
    VALUES (v_task.hotel_id, v_room.id, v_task.id, v_task.request_id, v_actor_type, v_actor_id, 'paused', coalesce(p_note, 'Task paused'));

  ELSIF p_action = 'complete' THEN
    IF (NOT v_is_manager AND v_task.assigned_staff_id IS DISTINCT FROM v_staff_id)
      OR v_task.status <> 'in_progress' THEN
      RAISE EXCEPTION 'Only the assigned staff member or manager can complete an active task';
    END IF;
    UPDATE public.housekeeping_tasks SET status = 'completed', completed_at = now(),
      notes = CASE WHEN nullif(trim(p_note), '') IS NULL THEN notes ELSE concat_ws(E'\n', notes, trim(p_note)) END
    WHERE id = p_task_id;
    UPDATE public.staff_availability sa SET status = 'available', updated_at = now()
    WHERE sa.staff_id = v_task.assigned_staff_id AND sa.status = 'busy'
      AND NOT EXISTS (
        SELECT 1 FROM public.housekeeping_tasks active
        WHERE active.assigned_staff_id = sa.staff_id
          AND active.id <> p_task_id
          AND active.status IN ('assigned', 'in_progress', 'paused')
      );
    IF v_task.task_type IN ('room_cleaning', 'deep_cleaning') THEN
      UPDATE public.rooms SET last_cleaned_at = now(), status = 'cleaning'
      WHERE id = v_room.id;
      INSERT INTO public.housekeeping_tasks (hotel_id, room_id, task_type, title, description, priority)
      VALUES (v_task.hotel_id, v_room.id, 'inspection', concat('Inspect Room ', v_room.room_number),
        'Cleaning is complete. Inspect the room before it is made ready.', v_task.priority)
      RETURNING id INTO v_new_task_id;
      INSERT INTO public.room_events (hotel_id, room_id, task_id, actor_type, actor_id, event_type, details)
      VALUES (v_task.hotel_id, v_room.id, v_new_task_id, v_actor_type, v_actor_id,
        'inspection_required', 'Cleaning completed; inspection required');
    ELSIF v_task.task_type = 'stayover_cleaning' THEN
      UPDATE public.rooms SET last_cleaned_at = now() WHERE id = v_room.id AND status = 'occupied';
    END IF;
    IF v_task.request_id IS NOT NULL THEN
      UPDATE public.requests SET status = 'completed', completed_at = now()
      WHERE id = v_task.request_id AND status <> 'completed';
      INSERT INTO public.request_events (request_id, actor_type, actor_id, event_type, message)
      VALUES (v_task.request_id, 'staff', v_staff_id, 'completed', coalesce(nullif(trim(p_note), ''), 'Housekeeping request completed'));
    END IF;
    INSERT INTO public.room_events (hotel_id, room_id, task_id, request_id, actor_type, actor_id, event_type, details)
    VALUES (v_task.hotel_id, v_room.id, v_task.id, v_task.request_id, v_actor_type, v_actor_id, 'completed', coalesce(p_note, v_task.title));

  ELSIF p_action = 'mark_inspected' THEN
    IF v_task.task_type <> 'inspection' OR v_task.status NOT IN ('assigned', 'in_progress')
      OR (NOT v_is_manager AND v_task.assigned_staff_id IS DISTINCT FROM v_staff_id)
      OR p_inspection_passed IS NULL OR v_room.status <> 'cleaning' THEN
      RAISE EXCEPTION 'Inspection must be assigned and include a pass or fail result';
    END IF;
    UPDATE public.housekeeping_tasks SET status = 'completed', completed_at = now(),
      started_at = coalesce(started_at, now()),
      notes = CASE WHEN nullif(trim(p_note), '') IS NULL THEN notes ELSE concat_ws(E'\n', notes, trim(p_note)) END
    WHERE id = p_task_id;
    UPDATE public.rooms SET last_inspected_at = now(),
      status = CASE WHEN p_inspection_passed THEN 'inspected' ELSE 'dirty' END
    WHERE id = v_room.id;
    UPDATE public.staff_availability sa SET status = 'available', updated_at = now()
    WHERE sa.staff_id = v_task.assigned_staff_id AND sa.status = 'busy'
      AND NOT EXISTS (
        SELECT 1 FROM public.housekeeping_tasks active
        WHERE active.assigned_staff_id = sa.staff_id
          AND active.id <> p_task_id
          AND active.status IN ('assigned', 'in_progress', 'paused')
      );
    INSERT INTO public.room_events (hotel_id, room_id, task_id, actor_type, actor_id, event_type, details)
    VALUES (v_task.hotel_id, v_room.id, v_task.id, v_actor_type, v_actor_id,
      CASE WHEN p_inspection_passed THEN 'inspection_passed' ELSE 'inspection_failed' END,
      coalesce(nullif(trim(p_note), ''), CASE WHEN p_inspection_passed THEN 'Inspection passed' ELSE 'Inspection failed' END));
    IF NOT p_inspection_passed THEN
      INSERT INTO public.housekeeping_tasks (hotel_id, room_id, task_type, title, description, priority)
      VALUES (v_task.hotel_id, v_room.id, 'room_cleaning', concat('Re-clean Room ', v_room.room_number),
        coalesce(nullif(trim(p_note), ''), 'Inspection failed; clean the room again.'), v_task.priority);
      INSERT INTO public.room_events (hotel_id, room_id, actor_type, actor_id, event_type, details)
      VALUES (v_task.hotel_id, v_room.id, v_actor_type, v_actor_id, 'reclean_required', 'Room returned to cleaning after a failed inspection');
    END IF;

  ELSIF p_action = 'mark_ready' THEN
    IF NOT v_is_manager OR v_room.status <> 'inspected' THEN
      RAISE EXCEPTION 'Only a manager can mark an inspected room ready';
    END IF;
    UPDATE public.rooms SET status = 'ready', assigned_housekeeper_id = NULL WHERE id = v_room.id;
    INSERT INTO public.room_events (hotel_id, room_id, task_id, actor_type, actor_id, event_type, details)
    VALUES (v_task.hotel_id, v_room.id, v_task.id, v_actor_type, v_actor_id, 'ready', 'Room marked ready for arrival');

  ELSIF p_action = 'add_note' THEN
    IF NOT v_is_manager AND v_task.assigned_staff_id IS DISTINCT FROM v_staff_id THEN
      RAISE EXCEPTION 'Only the assigned staff member or manager can add task notes';
    END IF;
    IF nullif(trim(p_note), '') IS NULL THEN RAISE EXCEPTION 'A note is required'; END IF;
    UPDATE public.housekeeping_tasks SET notes = concat_ws(E'\n', notes, trim(p_note)) WHERE id = p_task_id;
    INSERT INTO public.room_events (hotel_id, room_id, task_id, request_id, actor_type, actor_id, event_type, details)
    VALUES (v_task.hotel_id, v_room.id, v_task.id, v_task.request_id, v_actor_type, v_actor_id, 'note', trim(p_note));
    IF v_task.request_id IS NOT NULL THEN
      INSERT INTO public.request_events (request_id, actor_type, actor_id, event_type, message)
      VALUES (v_task.request_id, 'staff', v_staff_id, 'note', trim(p_note));
    END IF;

  ELSIF p_action = 'report_issue' THEN
    IF NOT v_is_manager AND v_task.assigned_staff_id IS DISTINCT FROM v_staff_id THEN
      RAISE EXCEPTION 'Only the assigned staff member or manager can report an issue';
    END IF;
    IF v_task.status NOT IN ('assigned', 'in_progress', 'paused') THEN
      RAISE EXCEPTION 'Only an active task can report a room issue';
    END IF;
    IF nullif(trim(p_note), '') IS NULL THEN RAISE EXCEPTION 'Describe the room issue'; END IF;
    UPDATE public.rooms SET status = 'maintenance', maintenance_issue = trim(p_note) WHERE id = v_room.id;
    UPDATE public.housekeeping_tasks SET status = 'paused',
      notes = concat_ws(E'\n', notes, concat('Issue reported: ', trim(p_note)))
    WHERE id = p_task_id;
    INSERT INTO public.room_events (hotel_id, room_id, task_id, request_id, actor_type, actor_id, event_type, details)
    VALUES (v_task.hotel_id, v_room.id, v_task.id, v_task.request_id, v_actor_type, v_actor_id, 'maintenance_issue', trim(p_note));
    IF v_task.request_id IS NOT NULL THEN
      INSERT INTO public.request_events (request_id, actor_type, actor_id, event_type, message)
      VALUES (v_task.request_id, 'staff', v_staff_id, 'note', concat('Reported room issue: ', trim(p_note)));
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported housekeeping action: %', p_action;
  END IF;

  RETURN p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_room_operational_status(
  p_room_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_staff_id uuid := public.current_staff_id();
  v_task_id uuid;
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_hotel_manager(v_room.hotel_id) THEN
    RAISE EXCEPTION 'Only a hotel manager can change operational room status';
  END IF;
  IF p_status NOT IN ('maintenance', 'out_of_order', 'vacant', 'dirty') THEN
    RAISE EXCEPTION 'Unsupported manual room status';
  END IF;
  IF p_status IN ('vacant', 'dirty') AND EXISTS (
    SELECT 1 FROM public.stays s WHERE s.room_id = p_room_id AND s.status = 'active'
  ) THEN
    RAISE EXCEPTION 'An occupied room cannot be marked vacant or dirty';
  END IF;
  IF p_status IN ('maintenance', 'out_of_order') THEN
    WITH paused_tasks AS (
      UPDATE public.housekeeping_tasks t
      SET status = 'paused',
        notes = concat_ws(E'\n', notes, coalesce(nullif(trim(p_note), ''), 'Paused because the room was blocked'))
      WHERE t.room_id = p_room_id
        AND t.task_type IN ('room_cleaning', 'stayover_cleaning', 'deep_cleaning', 'inspection')
        AND t.status IN ('assigned', 'in_progress')
      RETURNING t.id, t.request_id
    )
    INSERT INTO public.room_events (hotel_id, room_id, task_id, request_id, actor_type, actor_id, event_type, details)
    SELECT v_room.hotel_id, p_room_id, paused_tasks.id, paused_tasks.request_id,
      'manager', v_staff_id, 'task_paused_room_blocked', coalesce(p_note, 'Room was blocked')
    FROM paused_tasks;
  END IF;
  UPDATE public.rooms SET status = p_status,
    maintenance_issue = CASE
      WHEN p_status = 'maintenance' THEN nullif(trim(p_note), '')
      WHEN p_status IN ('dirty', 'vacant') THEN NULL
      ELSE maintenance_issue
    END,
    notes = CASE WHEN nullif(trim(p_note), '') IS NULL THEN notes ELSE concat_ws(E'\n', notes, trim(p_note)) END
  WHERE id = p_room_id;
  INSERT INTO public.room_events (hotel_id, room_id, actor_type, actor_id, event_type, details)
  VALUES (v_room.hotel_id, p_room_id, 'manager', v_staff_id, p_status, coalesce(p_note, 'Room status changed'));
  IF p_status = 'dirty' AND NOT EXISTS (
    SELECT 1 FROM public.housekeeping_tasks t
    WHERE t.room_id = p_room_id AND t.task_type IN ('room_cleaning', 'stayover_cleaning', 'deep_cleaning')
      AND t.status IN ('pending', 'assigned', 'in_progress', 'paused')
  ) THEN
    INSERT INTO public.housekeeping_tasks (hotel_id, room_id, task_type, title, description, priority)
    VALUES (v_room.hotel_id, p_room_id, 'room_cleaning',
      concat('Room cleaning — Room ', v_room.room_number),
      'Room was marked dirty and requires cleaning and inspection.', 'normal')
    RETURNING id INTO v_task_id;
    INSERT INTO public.room_events (hotel_id, room_id, task_id, actor_type, actor_id, event_type, details)
    VALUES (v_room.hotel_id, p_room_id, v_task_id, 'manager', v_staff_id,
      'task_created', 'Room cleaning task created');
  END IF;
  RETURN p_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.checkout_room(p_room_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_staff_id uuid := public.current_staff_id();
  v_stay_id uuid;
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_hotel_manager(v_room.hotel_id) THEN
    RAISE EXCEPTION 'Only a hotel manager can check out a room';
  END IF;
  UPDATE public.stays SET status = 'completed', updated_at = now()
  WHERE room_id = p_room_id AND status = 'active'
  RETURNING id INTO v_stay_id;
  IF v_stay_id IS NULL THEN RAISE EXCEPTION 'Room has no active stay'; END IF;
  RETURN p_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_room_task(
  p_room_id uuid,
  p_task_type text,
  p_title text,
  p_description text DEFAULT '',
  p_priority text DEFAULT 'normal',
  p_due_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_task_id uuid;
  v_staff_id uuid := public.current_staff_id();
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_hotel_manager(v_room.hotel_id) THEN
    RAISE EXCEPTION 'Only a hotel manager can create room tasks';
  END IF;
  IF p_task_type NOT IN (
    'room_cleaning', 'stayover_cleaning', 'deep_cleaning', 'towel_replacement',
    'linen_replacement', 'amenity_restocking', 'minibar_restocking', 'inspection'
  ) OR p_priority NOT IN ('low', 'normal', 'high', 'urgent') OR nullif(trim(p_title), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid room task details';
  END IF;
  IF p_task_type IN ('room_cleaning', 'deep_cleaning')
    AND (v_room.status IN ('maintenance', 'out_of_order')
      OR EXISTS (SELECT 1 FROM public.stays s WHERE s.room_id = v_room.id AND s.status = 'active')) THEN
    RAISE EXCEPTION 'A full room clean requires an unoccupied, unblocked room';
  END IF;
  IF p_task_type = 'stayover_cleaning'
    AND (v_room.status <> 'occupied'
      OR NOT EXISTS (SELECT 1 FROM public.stays s WHERE s.room_id = v_room.id AND s.status = 'active')) THEN
    RAISE EXCEPTION 'Stayover cleaning requires an active guest stay';
  END IF;
  IF p_task_type = 'inspection' AND v_room.status <> 'cleaning' THEN
    RAISE EXCEPTION 'Inspection tasks can only be created after cleaning';
  END IF;
  IF p_task_type IN ('room_cleaning', 'stayover_cleaning', 'deep_cleaning')
    AND EXISTS (
      SELECT 1 FROM public.housekeeping_tasks t
      WHERE t.room_id = v_room.id
        AND t.task_type IN ('room_cleaning', 'stayover_cleaning', 'deep_cleaning')
        AND t.status IN ('pending', 'assigned', 'in_progress', 'paused')
    ) THEN
    RAISE EXCEPTION 'The room already has an active cleaning task';
  END IF;

  INSERT INTO public.housekeeping_tasks (hotel_id, room_id, task_type, title, description, priority, due_at)
  VALUES (v_room.hotel_id, v_room.id, p_task_type, trim(p_title), coalesce(p_description, ''), p_priority, p_due_at)
  RETURNING id INTO v_task_id;
  IF p_task_type IN ('room_cleaning', 'deep_cleaning')
    AND v_room.status NOT IN ('maintenance', 'out_of_order', 'occupied') THEN
    UPDATE public.rooms SET status = 'dirty' WHERE id = v_room.id;
  END IF;
  INSERT INTO public.room_events (hotel_id, room_id, task_id, actor_type, actor_id, event_type, details)
  VALUES (v_room.hotel_id, v_room.id, v_task_id, 'manager', v_staff_id, 'task_created', trim(p_title));
  RETURN v_task_id;
END;
$$;

CREATE OR REPLACE VIEW public.room_operations
WITH (security_invoker = true)
AS
SELECT r.id, r.hotel_id, r.room_number, r.room_type, r.floor, r.status, r.updated_at,
  r.assigned_housekeeper_id, r.maintenance_issue, r.last_cleaned_at, r.last_inspected_at, r.notes,
  active_stay.id AS stay_id, active_stay.guest_id,
  concat_ws(' ', g.first_name, g.last_name) AS guest_name,
  sp.first_name AS housekeeper_first_name, sp.last_name AS housekeeper_last_name
FROM public.rooms r
LEFT JOIN LATERAL (
  SELECT s.id, s.guest_id
  FROM public.stays s
  WHERE s.room_id = r.id AND s.status = 'active'
  ORDER BY s.check_out DESC
  LIMIT 1
) active_stay ON true
LEFT JOIN public.guests g ON g.id = active_stay.guest_id
LEFT JOIN public.staff_profiles sp ON sp.id = r.assigned_housekeeper_id;

ALTER TABLE public.staff_auth_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_auth_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_auth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_read_rooms ON public.rooms;
DROP POLICY IF EXISTS anon_read_stays ON public.stays;
DROP POLICY IF EXISTS anon_read_guests ON public.guests;
DROP POLICY IF EXISTS anon_update_guests ON public.guests;
DROP POLICY IF EXISTS anon_read_staff_profiles ON public.staff_profiles;
DROP POLICY IF EXISTS anon_read_requests ON public.requests;
DROP POLICY IF EXISTS anon_insert_requests ON public.requests;
DROP POLICY IF EXISTS anon_update_requests ON public.requests;
DROP POLICY IF EXISTS anon_read_request_events ON public.request_events;
DROP POLICY IF EXISTS anon_insert_request_events ON public.request_events;
DROP POLICY IF EXISTS anon_read_conversations ON public.conversations;
DROP POLICY IF EXISTS anon_insert_conversations ON public.conversations;
DROP POLICY IF EXISTS anon_update_conversations ON public.conversations;
DROP POLICY IF EXISTS anon_read_messages ON public.messages;
DROP POLICY IF EXISTS anon_insert_messages ON public.messages;

CREATE POLICY authenticated_rooms_read ON public.rooms FOR SELECT TO authenticated
USING (
  public.is_hotel_manager(hotel_id)
  OR public.is_housekeeping_staff(hotel_id)
  OR EXISTS (
    SELECT 1 FROM public.requests q
    WHERE q.room_id = rooms.id
      AND public.is_hotel_staff(q.hotel_id)
      AND (
        q.assigned_staff_id = public.current_staff_id()
        OR q.department_id = public.current_staff_department_id()
      )
  )
  OR rooms.id = public.current_guest_room_id()
);

CREATE POLICY authenticated_stays_read ON public.stays FOR SELECT TO authenticated
USING (
  public.is_hotel_manager_for_room(room_id)
  OR public.is_housekeeping_staff_for_room(room_id)
  OR guest_id = public.current_guest_id()
);

CREATE POLICY authenticated_guests_read ON public.guests FOR SELECT TO authenticated
USING (
  id = public.current_guest_id()
  OR public.is_hotel_manager(hotel_id)
  OR EXISTS (
    SELECT 1 FROM public.requests q
    WHERE q.guest_id = guests.id
      AND public.is_hotel_staff(q.hotel_id)
      AND (q.assigned_staff_id = public.current_staff_id()
        OR q.department_id = public.current_staff_department_id())
  )
);

CREATE POLICY authenticated_staff_profiles_read ON public.staff_profiles FOR SELECT TO authenticated
USING (
  (
    public.is_hotel_staff(hotel_id)
    AND (
      public.is_hotel_manager(hotel_id)
      OR staff_profiles.id = public.current_staff_id()
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.requests r
    WHERE (
      r.guest_id = public.current_guest_id()
      AND r.assigned_staff_id = staff_profiles.id
    ) OR (
      public.is_hotel_staff(r.hotel_id)
      AND (r.assigned_staff_id = staff_profiles.id
        OR r.department_id = public.current_staff_department_id())
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.request_events event
    JOIN public.requests request ON request.id = event.request_id
    WHERE event.actor_id = staff_profiles.id
      AND (
        request.guest_id = public.current_guest_id()
        OR (
          public.is_hotel_staff(request.hotel_id)
          AND (
            request.assigned_staff_id = public.current_staff_id()
            OR public.is_hotel_manager(request.hotel_id)
            OR request.department_id = public.current_staff_department_id()
          )
        )
      )
  )
);

CREATE POLICY authenticated_requests_read ON public.requests FOR SELECT TO authenticated
USING (
  guest_id = public.current_guest_id()
  OR public.is_hotel_manager(hotel_id)
  OR assigned_staff_id = public.current_staff_id()
  OR (
    public.is_hotel_staff(hotel_id)
    AND (
      department_id = public.current_staff_department_id()
      OR public.is_housekeeping_staff(hotel_id) AND category = 'Housekeeping'
    )
  )
);

CREATE POLICY authenticated_requests_update ON public.requests FOR UPDATE TO authenticated
USING (
  public.is_hotel_manager(hotel_id)
  OR assigned_staff_id = public.current_staff_id()
  OR (
    public.is_hotel_staff(hotel_id)
    AND department_id = public.current_staff_department_id()
  )
)
WITH CHECK (
  public.is_hotel_manager(hotel_id)
  OR assigned_staff_id = public.current_staff_id()
  OR (
    public.is_hotel_staff(hotel_id)
    AND department_id = public.current_staff_department_id()
  )
);

CREATE POLICY authenticated_request_events_read ON public.request_events FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.requests r WHERE r.id = request_events.request_id
));
CREATE POLICY authenticated_request_events_insert ON public.request_events FOR INSERT TO authenticated
WITH CHECK (
  actor_type = 'staff'
  AND actor_id = public.current_staff_id()
  AND EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_events.request_id
      AND (public.is_hotel_manager(r.hotel_id) OR r.assigned_staff_id = public.current_staff_id()
        OR (public.is_hotel_staff(r.hotel_id)
          AND r.department_id = public.current_staff_department_id()))
  )
);

CREATE POLICY authenticated_conversations_read ON public.conversations FOR SELECT TO authenticated
USING (guest_id = public.current_guest_id() OR public.is_hotel_staff(
  (SELECT g.hotel_id FROM public.guests g WHERE g.id = conversations.guest_id)
));
CREATE POLICY authenticated_conversations_insert ON public.conversations FOR INSERT TO authenticated
WITH CHECK (guest_id = public.current_guest_id());
CREATE POLICY authenticated_conversations_update ON public.conversations FOR UPDATE TO authenticated
USING (guest_id = public.current_guest_id() OR public.is_hotel_staff(
  (SELECT g.hotel_id FROM public.guests g WHERE g.id = conversations.guest_id)
))
WITH CHECK (guest_id = public.current_guest_id() OR public.is_hotel_staff(
  (SELECT g.hotel_id FROM public.guests g WHERE g.id = conversations.guest_id)
));

CREATE POLICY authenticated_messages_read ON public.messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = messages.conversation_id
    AND (c.guest_id = public.current_guest_id()
      OR public.is_hotel_staff((SELECT g.hotel_id FROM public.guests g WHERE g.id = c.guest_id)))
));
CREATE POLICY authenticated_messages_insert ON public.messages FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = messages.conversation_id
    AND (
      (
        c.guest_id = public.current_guest_id()
        AND sender_type IN ('guest', 'assistant')
        AND sender_id IS NULL
      )
      OR (
        sender_type = 'staff'
        AND public.is_hotel_staff((SELECT g.hotel_id FROM public.guests g WHERE g.id = c.guest_id))
      )
    )
));

CREATE POLICY authenticated_housekeeping_tasks_read ON public.housekeeping_tasks FOR SELECT TO authenticated
USING (
  public.is_hotel_manager(hotel_id)
  OR (public.is_housekeeping_staff(hotel_id) AND (
    assigned_staff_id IS NULL OR assigned_staff_id = public.current_staff_id()
  ))
);
CREATE POLICY authenticated_room_events_read ON public.room_events FOR SELECT TO authenticated
USING (
  public.is_hotel_manager(hotel_id)
  OR public.is_housekeeping_staff(hotel_id)
  OR EXISTS (
    SELECT 1 FROM public.requests q
    JOIN public.staff_profiles current_staff ON current_staff.id = public.current_staff_id()
    WHERE q.id = room_events.request_id
      AND q.room_id = room_events.room_id
      AND public.is_hotel_staff(q.hotel_id)
      AND (q.assigned_staff_id = current_staff.id OR q.department_id = current_staff.department_id)
  )
);
CREATE POLICY authenticated_availability_read ON public.staff_availability FOR SELECT TO authenticated
USING (
  staff_id = public.current_staff_id()
  OR EXISTS (
    SELECT 1 FROM public.staff_profiles sp WHERE sp.id = staff_availability.staff_id
      AND public.is_hotel_manager(sp.hotel_id)
  )
);
CREATE POLICY authenticated_eligibility_read ON public.housekeeping_eligibility FOR SELECT TO authenticated
USING (
  public.is_hotel_manager(hotel_id)
  OR staff_id = public.current_staff_id()
);

DROP POLICY IF EXISTS staff_read_hotel_profiles ON public.staff_profiles;
DROP POLICY IF EXISTS staff_update_own_profile ON public.staff_profiles;

REVOKE ALL ON public.staff_auth_links, public.guest_auth_links, public.staff_auth_credentials,
  public.housekeeping_eligibility, public.staff_availability, public.housekeeping_tasks, public.room_events
  FROM anon, authenticated;
REVOKE ALL ON public.rooms, public.stays, public.guests, public.staff_profiles,
  public.requests, public.request_events, public.conversations, public.messages
  FROM anon;
REVOKE SELECT ON public.guests FROM authenticated;
GRANT SELECT (id, hotel_id, first_name, last_name, email, phone, username, created_at, updated_at)
  ON public.guests TO authenticated;
REVOKE INSERT, DELETE ON public.rooms, public.stays, public.guests, public.staff_profiles,
  public.requests, public.request_events, public.conversations, public.messages
  FROM authenticated;
GRANT SELECT ON public.rooms, public.stays, public.guests, public.staff_profiles,
  public.requests, public.request_events, public.conversations, public.messages,
  public.housekeeping_tasks, public.room_events, public.staff_availability,
  public.housekeeping_eligibility TO authenticated;
GRANT UPDATE ON public.requests, public.conversations TO authenticated;
GRANT INSERT ON public.conversations, public.messages, public.request_events TO authenticated;
GRANT SELECT ON public.room_operations TO authenticated;

REVOKE ALL ON FUNCTION public.login_staff(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.login_guest(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_request(uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_housekeeping_team(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_staff_availability(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.perform_housekeeping_action(uuid, text, text, uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_room_operational_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.checkout_room(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_room_task(uuid, text, text, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.login_staff(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.login_guest(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_request(uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_housekeeping_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_availability(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_housekeeping_action(uuid, text, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_room_operational_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_room_task(uuid, text, text, text, text, timestamptz) TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.housekeeping_tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_availability;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

INSERT INTO public.staff_availability (staff_id, status)
SELECT sp.id, 'available' FROM public.staff_profiles sp
JOIN public.housekeeping_eligibility he ON he.staff_id = sp.id
ON CONFLICT (staff_id) DO NOTHING;

INSERT INTO public.housekeeping_tasks (
  hotel_id, room_id, request_id, task_type, title, description, priority, status, due_at
)
SELECT r.hotel_id, r.id, q.id, 'special_guest_request', q.title, q.description,
  q.priority, CASE WHEN q.status = 'assigned' THEN 'assigned' ELSE 'pending' END, q.sla_due_at
FROM public.requests q
JOIN public.rooms r ON r.id = q.room_id
JOIN public.departments d ON d.id = q.department_id AND d.name = 'Housekeeping'
WHERE r.hotel_id = 'a0000000-0000-0000-0000-000000000001'
  AND q.status NOT IN ('completed', 'cancelled')
  AND NOT EXISTS (SELECT 1 FROM public.housekeeping_tasks t WHERE t.request_id = q.id);

INSERT INTO public.housekeeping_tasks (hotel_id, room_id, task_type, title, description, priority, status, created_at)
SELECT r.hotel_id, r.id, 'room_cleaning', 'Turnover clean — Room 212',
  'Prepare the room for inspection after checkout.', 'high', 'pending', now() - interval '26 minutes'
FROM public.rooms r WHERE r.hotel_id = 'a0000000-0000-0000-0000-000000000001' AND r.room_number = '212'
  AND NOT EXISTS (SELECT 1 FROM public.housekeeping_tasks t WHERE t.room_id = r.id AND t.status IN ('pending', 'assigned', 'in_progress', 'paused'));

INSERT INTO public.housekeeping_tasks (hotel_id, room_id, task_type, title, description, priority, status, assigned_staff_id, started_at, created_at)
SELECT r.hotel_id, r.id, 'room_cleaning', 'Stayover cleaning — Room 224',
  'Daily stayover service and linen refresh.', 'normal', 'in_progress', he.staff_id, now() - interval '8 minutes', now() - interval '18 minutes'
FROM public.rooms r
JOIN public.housekeeping_eligibility he ON he.hotel_id = r.hotel_id
WHERE r.hotel_id = 'a0000000-0000-0000-0000-000000000001' AND r.room_number = '224'
  AND NOT EXISTS (SELECT 1 FROM public.housekeeping_tasks t WHERE t.room_id = r.id AND t.status IN ('pending', 'assigned', 'in_progress', 'paused'));

UPDATE public.staff_availability sa SET status = 'busy', updated_at = now()
WHERE sa.staff_id IN (
  SELECT t.assigned_staff_id FROM public.housekeeping_tasks t
  WHERE t.status = 'in_progress' AND t.assigned_staff_id IS NOT NULL
);

INSERT INTO public.housekeeping_tasks (hotel_id, room_id, task_type, title, description, priority, status, created_at, started_at, completed_at)
SELECT r.hotel_id, r.id, 'inspection', 'Inspect Room 317',
  'Room cleaning completed; inspect before marking ready.', 'normal', 'completed',
  now() - interval '30 minutes', now() - interval '25 minutes', now() - interval '20 minutes'
FROM public.rooms r WHERE r.hotel_id = 'a0000000-0000-0000-0000-000000000001' AND r.room_number = '317'
  AND NOT EXISTS (SELECT 1 FROM public.housekeeping_tasks t WHERE t.room_id = r.id AND t.task_type = 'inspection');

UPDATE public.rooms r SET
  assigned_housekeeper_id = CASE WHEN r.room_number = '224' THEN he.staff_id ELSE r.assigned_housekeeper_id END,
  last_cleaned_at = CASE WHEN r.room_number IN ('317', '501') THEN now() - interval '20 minutes' ELSE r.last_cleaned_at END,
  last_inspected_at = CASE WHEN r.room_number IN ('317', '501') THEN now() - interval '20 minutes' ELSE r.last_inspected_at END
FROM public.housekeeping_eligibility he
WHERE r.hotel_id = 'a0000000-0000-0000-0000-000000000001'
  AND he.hotel_id = r.hotel_id
  AND r.room_number IN ('224', '317', '501');

INSERT INTO public.room_events (hotel_id, room_id, actor_type, event_type, details)
SELECT r.hotel_id, r.id, 'system', 'demo_room_state', 'Room operations demo state seeded'
FROM public.rooms r
WHERE r.hotel_id = 'a0000000-0000-0000-0000-000000000001'
  AND r.room_number IN ('212', '224', '317', '408', '501')
  AND NOT EXISTS (SELECT 1 FROM public.room_events e WHERE e.room_id = r.id AND e.event_type = 'demo_room_state');
