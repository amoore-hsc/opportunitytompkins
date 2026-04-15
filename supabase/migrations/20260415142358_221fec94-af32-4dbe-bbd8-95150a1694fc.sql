
-- Employment opportunities table
CREATE TABLE public.employment_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title text NOT NULL,
  employer text NOT NULL,
  employment_type text,
  wage text,
  location text,
  posting_url text NOT NULL,
  source_site text NOT NULL DEFAULT 'manual',
  source_id text,
  is_manual boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_site, source_id)
);

ALTER TABLE public.employment_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active employment opportunities"
  ON public.employment_opportunities FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can view all employment opportunities"
  ON public.employment_opportunities FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert employment opportunities"
  ON public.employment_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update employment opportunities"
  ON public.employment_opportunities FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete employment opportunities"
  ON public.employment_opportunities FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage employment opportunities"
  ON public.employment_opportunities FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE TRIGGER update_employment_opportunities_updated_at
  BEFORE UPDATE ON public.employment_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Scrape sources table
CREATE TABLE public.scrape_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  scrape_config jsonb,
  active boolean NOT NULL DEFAULT true,
  last_scraped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scrape_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view scrape sources"
  ON public.scrape_sources FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert scrape sources"
  ON public.scrape_sources FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update scrape sources"
  ON public.scrape_sources FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete scrape sources"
  ON public.scrape_sources FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage scrape sources"
  ON public.scrape_sources FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
