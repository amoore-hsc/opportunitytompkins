ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS manual_reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_manual_reminder_at timestamptz;