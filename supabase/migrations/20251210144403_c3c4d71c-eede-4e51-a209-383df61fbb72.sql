-- Add UPDATE policy for opportunities table
CREATE POLICY "Anyone can update opportunities" 
ON public.opportunities 
FOR UPDATE 
USING (true)
WITH CHECK (true);