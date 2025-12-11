-- Create application_counts table for aggregated tracking
CREATE TABLE public.application_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id, application_date)
);

-- Enable RLS
ALTER TABLE public.application_counts ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to insert/update (using service role)
CREATE POLICY "Service role can manage application_counts"
ON public.application_counts
FOR ALL
USING (true)
WITH CHECK (true);

-- Allow admins to read application counts
CREATE POLICY "Admins can view application_counts"
ON public.application_counts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;