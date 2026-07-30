-- 1. Let the public view read active listings independent of the locked-down base table
ALTER VIEW public.public_opportunities SET (security_invoker = false);

-- 2. Restore Data API grants
GRANT SELECT ON public.public_opportunities TO anon;
GRANT SELECT ON public.public_opportunities TO authenticated;
GRANT ALL ON public.public_opportunities TO service_role;

GRANT INSERT ON public.opportunities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;

GRANT SELECT ON public.employment_opportunities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employment_opportunities TO authenticated;
GRANT ALL ON public.employment_opportunities TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_counts TO authenticated;
GRANT ALL ON public.application_counts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrape_sources TO authenticated;
GRANT ALL ON public.scrape_sources TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;