
-- Drop broad public SELECT on opportunities so edit_token cannot be read by anon/authenticated
DROP POLICY IF EXISTS "Public can read active opportunities" ON public.opportunities;

-- Lock down SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- Validation & sanitization trigger for opportunities inserts
CREATE OR REPLACE FUNCTION public.validate_opportunity_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Enforce reasonable length limits on user-supplied text
  IF length(coalesce(NEW.org_name, '')) > 200 THEN
    RAISE EXCEPTION 'org_name too long';
  END IF;
  IF length(coalesce(NEW.description, '')) > 5000 THEN
    RAISE EXCEPTION 'description too long';
  END IF;
  IF length(coalesce(NEW.position_title, '')) > 200 THEN
    RAISE EXCEPTION 'position_title too long';
  END IF;
  IF length(coalesce(NEW.location, '')) > 300 THEN
    RAISE EXCEPTION 'location too long';
  END IF;
  IF length(coalesce(NEW.additional_requirements, '')) > 3000 THEN
    RAISE EXCEPTION 'additional_requirements too long';
  END IF;

  -- Basic email format check
  IF NEW.org_email IS NOT NULL
     AND NEW.org_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'org_email is not a valid email address';
  END IF;

  -- Public submitters must not preset internal bookkeeping columns.
  -- Service role and admins bypass RLS entirely and skip this trigger via the guard below.
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.edit_token := gen_random_uuid();
    NEW.active := true;
    NEW.reminder_sent_at := NULL;
    NEW.deactivated_at := NULL;
    NEW.positions_filled := NULL;
    NEW.removal_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_opportunity_insert_trg ON public.opportunities;
CREATE TRIGGER validate_opportunity_insert_trg
BEFORE INSERT ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.validate_opportunity_insert();
