CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- If the only changed columns are reminder-tracking fields, preserve updated_at
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
$$;