-- Allow admins to view ALL opportunities (including inactive ones)
CREATE POLICY "Admins can view all opportunities"
ON public.opportunities
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));