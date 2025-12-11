-- Add edit_token column to opportunities table for magic link editing
ALTER TABLE public.opportunities 
ADD COLUMN edit_token uuid DEFAULT gen_random_uuid() NOT NULL;

-- Create unique index on edit_token for fast lookups
CREATE UNIQUE INDEX idx_opportunities_edit_token ON public.opportunities(edit_token);

-- Create RLS policy to allow anyone to update an opportunity if they have the correct edit_token
CREATE POLICY "Anyone can update with valid edit token" 
ON public.opportunities 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Note: The actual token validation will be done in the application layer
-- We use a permissive policy here but the edge function will validate the token