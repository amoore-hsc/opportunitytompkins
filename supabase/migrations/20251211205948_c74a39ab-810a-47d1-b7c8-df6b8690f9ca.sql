-- Add column to track when reminder was sent
ALTER TABLE public.opportunities 
ADD COLUMN reminder_sent_at timestamp with time zone DEFAULT NULL;