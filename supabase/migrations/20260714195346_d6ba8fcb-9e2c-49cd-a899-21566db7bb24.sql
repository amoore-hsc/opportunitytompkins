
DROP VIEW IF EXISTS public.public_opportunities;

-- Column-level grants: anon/authenticated may only read safe columns
GRANT SELECT (
  id, type, role_classification, position_title, description,
  location, on_bus_route, hours_available, days_times_available,
  additional_requirements, org_name, created_at, updated_at,
  program_name, website, program_components, active
) ON public.opportunities TO anon, authenticated;

-- Row-level policy allowing public read of active listings only
CREATE POLICY "Public can read active opportunities"
ON public.opportunities
FOR SELECT
TO anon, authenticated
USING (active = true);

-- Security-invoker view returning only public-safe columns
CREATE VIEW public.public_opportunities
WITH (security_invoker = true) AS
SELECT
  o.id, o.type, o.role_classification, o.position_title, o.description,
  o.location, o.on_bus_route, o.hours_available, o.days_times_available,
  o.additional_requirements, o.org_name, o.created_at, o.updated_at,
  o.program_name, o.website, o.program_components
FROM public.opportunities o
WHERE o.active = true;

GRANT SELECT ON public.public_opportunities TO anon, authenticated;
