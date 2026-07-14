
-- Remove public SELECT policy exposing contact info; replace with SECURITY DEFINER function that returns only non-sensitive fields
DROP POLICY IF EXISTS "Anyone can view active opportunities" ON public.opportunities;

CREATE OR REPLACE FUNCTION public.get_public_opportunities()
RETURNS TABLE (
  id uuid,
  type text,
  role_classification text,
  position_title text,
  description text,
  location text,
  on_bus_route boolean,
  hours_available text,
  days_times_available text,
  additional_requirements text,
  org_name text,
  created_at timestamptz,
  updated_at timestamptz,
  program_name text,
  website text,
  program_components text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id, o.type, o.role_classification, o.position_title, o.description,
    o.location, o.on_bus_route, o.hours_available, o.days_times_available,
    o.additional_requirements, o.org_name, o.created_at, o.updated_at,
    o.program_name, o.website, o.program_components
  FROM public.opportunities o
  WHERE o.active = true
  ORDER BY o.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_opportunities() TO anon, authenticated;
