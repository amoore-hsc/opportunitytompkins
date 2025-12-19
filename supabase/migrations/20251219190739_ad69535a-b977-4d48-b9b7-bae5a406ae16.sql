-- Add columns to track filled positions and removal reasons
ALTER TABLE public.opportunities 
ADD COLUMN positions_filled integer DEFAULT NULL,
ADD COLUMN removal_reason text DEFAULT NULL,
ADD COLUMN deactivated_at timestamp with time zone DEFAULT NULL;