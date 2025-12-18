-- Drop the insecure policy that allows anyone to modify application_counts
DROP POLICY IF EXISTS "Service role can manage application_counts" ON public.application_counts;

-- Create a proper policy that actually checks for service role
-- Service role is used by edge functions to track application counts
CREATE POLICY "Service role can manage application_counts"
ON public.application_counts
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');