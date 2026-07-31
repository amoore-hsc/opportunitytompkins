-- 1. Replace SECURITY DEFINER view with security_invoker + column-level grants
DROP VIEW IF EXISTS public.public_opportunities;

CREATE VIEW public.public_opportunities
WITH (security_invoker = true) AS
SELECT
  id,
  org_name,
  position_title,
  program_name,
  program_components,
  description,
  location,
  days_times_available,
  hours_available,
  on_bus_route,
  additional_requirements,
  role_classification,
  type,
  website,
  created_at,
  updated_at
FROM public.opportunities
WHERE active = true;

GRANT SELECT ON public.public_opportunities TO anon, authenticated;
GRANT ALL ON public.public_opportunities TO service_role;

-- Column-scoped read access on the base table so the invoker view works
-- without ever exposing edit_token, org_email, org_phone, admin_* fields.
REVOKE SELECT ON public.opportunities FROM anon;
GRANT SELECT (
  id, org_name, position_title, program_name, program_components, description,
  location, days_times_available, hours_available, on_bus_route,
  additional_requirements, role_classification, type, website,
  created_at, updated_at, active
) ON public.opportunities TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view active opportunities" ON public.opportunities;
CREATE POLICY "Anyone can view active opportunities"
ON public.opportunities
FOR SELECT
TO anon, authenticated
USING (active = true);

-- 2. feedback_submissions: replace WITH CHECK (true) with real validation
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback_submissions;
CREATE POLICY "Anyone can submit feedback"
ON public.feedback_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  feedback_type = ANY (ARRAY['bug'::text, 'feature'::text])
  AND length(btrim(message)) >= 5
  AND length(message) <= 4000
  AND length(COALESCE(submitter_name, ''::text)) <= 200
  AND length(COALESCE(submitter_email, ''::text)) <= 320
  AND (submitter_email IS NULL OR submitter_email = '' OR submitter_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  AND length(COALESCE(page_path, ''::text)) <= 500
  AND length(COALESCE(user_agent, ''::text)) <= 500
  AND status = 'new'
);

-- 3. application_counts: scope policies to proper roles
DROP POLICY IF EXISTS "Admins can view application_counts" ON public.application_counts;
CREATE POLICY "Admins can view application_counts"
ON public.application_counts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role can manage application_counts" ON public.application_counts;
CREATE POLICY "Service role can manage application_counts"
ON public.application_counts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. employment_opportunities / scrape_sources: scope service policies
DROP POLICY IF EXISTS "Service role can manage employment opportunities" ON public.employment_opportunities;
CREATE POLICY "Service role can manage employment opportunities"
ON public.employment_opportunities
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view active employment opportunities" ON public.employment_opportunities;
CREATE POLICY "Anyone can view active employment opportunities"
ON public.employment_opportunities
FOR SELECT
TO anon, authenticated
USING (active = true);

DROP POLICY IF EXISTS "Service role can manage scrape sources" ON public.scrape_sources;
CREATE POLICY "Service role can manage scrape sources"
ON public.scrape_sources
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);