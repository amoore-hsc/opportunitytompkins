-- Remove the insecure RLS policy that allows anyone to update opportunities
-- Token validation is handled securely in the edge function, which uses service role
DROP POLICY IF EXISTS "Anyone can update with valid edit token" ON public.opportunities;