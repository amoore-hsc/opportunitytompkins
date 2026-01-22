-- Add column to track when the 2-week interest notification was sent
ALTER TABLE public.opportunities 
ADD COLUMN interest_notification_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.opportunities.interest_notification_sent_at IS 'Timestamp when the 2-week application interest notification email was sent to the organization';