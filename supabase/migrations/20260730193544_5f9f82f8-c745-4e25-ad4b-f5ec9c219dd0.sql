-- Run the insert validation trigger with owner rights so its internal role check succeeds for anonymous submitters
CREATE OR REPLACE FUNCTION public.validate_opportunity_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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

  IF NEW.org_email IS NOT NULL
     AND NEW.org_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'org_email is not a valid email address';
  END IF;

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
$function$;

REVOKE EXECUTE ON FUNCTION public.validate_opportunity_insert() FROM PUBLIC, anon, authenticated;

-- Scope the admin read rule to signed-in users only
DROP POLICY IF EXISTS "Admins can view all opportunities" ON public.opportunities;
CREATE POLICY "Admins can view all opportunities"
ON public.opportunities
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));