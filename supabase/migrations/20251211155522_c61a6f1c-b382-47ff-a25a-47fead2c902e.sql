-- Add position_title column to opportunities table
ALTER TABLE public.opportunities
ADD COLUMN position_title text;