
DROP FUNCTION IF EXISTS public.get_public_opportunities();

CREATE OR REPLACE VIEW public.public_opportunities AS
SELECT
  o.id, o.type, o.role_classification, o.position_title, o.description,
  o.location, o.on_bus_route, o.hours_available, o.days_times_available,
  o.additional_requirements, o.org_name, o.created_at, o.updated_at,
  o.program_name, o.website, o.program_components
FROM public.opportunities o
WHERE o.active = true;

GRANT SELECT ON public.public_opportunities TO anon, authenticated;
