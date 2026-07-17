CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Allow explicit administrative timestamp corrections when updated_at is the only changed field.
    IF (
      (to_jsonb(OLD) - 'updated_at') IS NOT DISTINCT FROM (to_jsonb(NEW) - 'updated_at')
      AND NEW.updated_at IS DISTINCT FROM OLD.updated_at
    ) THEN
      RETURN NEW;
    END IF;

    -- If the only changed columns are reminder-tracking fields, preserve updated_at.
    IF (
      to_jsonb(OLD) - '{manual_reminder_count,last_manual_reminder_at,reminder_sent_at,updated_at}'::text[]
    ) IS DISTINCT FROM (
      to_jsonb(NEW) - '{manual_reminder_count,last_manual_reminder_at,reminder_sent_at,updated_at}'::text[]
    ) THEN
      NEW.updated_at = now();
    ELSE
      NEW.updated_at = OLD.updated_at;
    END IF;
  ELSE
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE public.opportunities
SET updated_at = created_at
WHERE active = true
  AND reminder_sent_at IS NOT NULL
  AND created_at <= now() - interval '90 days'
  AND abs(extract(epoch from (updated_at - reminder_sent_at))) <= 120;