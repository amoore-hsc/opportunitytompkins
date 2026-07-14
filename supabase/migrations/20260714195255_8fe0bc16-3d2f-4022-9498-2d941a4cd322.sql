
-- Restrict SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_public_opportunities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_opportunities() TO anon, authenticated, service_role;

-- Tighten public INSERT on opportunities: require basic validation, and disallow client-setting bookkeeping fields
DROP POLICY IF EXISTS "Anyone can create opportunities" ON public.opportunities;

CREATE OR REPLACE FUNCTION public.validate_new_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Basic content validation
  IF NEW.org_name IS NULL OR length(btrim(NEW.org_name)) < 2 OR length(NEW.org_name) > 200 THEN
    RAISE EXCEPTION 'Invalid org_name';
  END IF;
  IF NEW.org_email IS NULL OR NEW.org_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(NEW.org_email) > 255 THEN
    RAISE EXCEPTION 'Invalid org_email';
  END IF;
  IF NEW.description IS NULL OR length(btrim(NEW.description)) < 5 OR length(NEW.description) > 5000 THEN
    RAISE EXCEPTION 'Invalid description';
  END IF;
  IF NEW.type IS NULL OR NEW.type NOT IN ('volunteer','education') THEN
    RAISE EXCEPTION 'Invalid type';
  END IF;

  -- Do not allow public callers to set internal / bookkeeping fields on insert
  NEW.edit_token := gen_random_uuid();
  NEW.active := true;
  NEW.reminder_sent_at := NULL;
  NEW.interest_notification_sent_at := NULL;
  NEW.positions_filled := NULL;
  NEW.removal_reason := NULL;
  NEW.deactivated_at := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_new_opportunity_trg ON public.opportunities;
CREATE TRIGGER validate_new_opportunity_trg
BEFORE INSERT ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.validate_new_opportunity();

CREATE POLICY "Anyone can create opportunities"
ON public.opportunities
FOR INSERT
TO anon, authenticated
WITH CHECK (
  org_name IS NOT NULL
  AND org_email IS NOT NULL
  AND description IS NOT NULL
  AND type IN ('volunteer','education')
);
