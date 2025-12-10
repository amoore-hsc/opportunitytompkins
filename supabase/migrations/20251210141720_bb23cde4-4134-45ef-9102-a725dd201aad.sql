-- Add role_classification column to opportunities table
ALTER TABLE public.opportunities 
ADD COLUMN role_classification text;

-- Create an index for better filter performance
CREATE INDEX idx_opportunities_role_classification ON public.opportunities(role_classification);