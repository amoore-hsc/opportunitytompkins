-- Contact details and outside links for the SNAP / Medicaid features.
--
-- The header contact strip, homepage popup and SNAP screener results read
-- this table so a phone number or link can be changed in the Supabase table
-- editor without a code deploy. The site ships the same values as defaults
-- and falls back to them if this table is missing, empty or unreachable.
--
-- Public, read-only, and holds NO personal data. The SNAP screener never
-- writes here (or anywhere): answers stay in the visitor's browser memory.
--
-- The ABAWD medical and Caregiver's form links are NOT here: they are the
-- existing Electronic Forms entries in the site config.

CREATE TABLE IF NOT EXISTS public.site_settings (
  key        TEXT PRIMARY KEY CHECK (key ~ '^[a-z0-9_]{1,64}$'),
  label      TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 200),
  phone      TEXT CHECK (phone IS NULL OR length(phone) <= 40),
  url        TEXT CHECK (url IS NULL OR (url ~ '^https://' AND length(url) <= 500)),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_settings IS
  'Public contact info and links (SNAP/DSS, Medicaid/HSC, NY State of Health, myBenefits, NYDocSubmit). Read by anyone, edited by admins. No personal data.';

CREATE OR REPLACE FUNCTION public.touch_site_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_settings_touch ON public.site_settings;
CREATE TRIGGER site_settings_touch
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_site_settings();

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Anyone can read site settings"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert site settings" ON public.site_settings;
CREATE POLICY "Admins can insert site settings"
ON public.site_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
CREATE POLICY "Admins can update site settings"
ON public.site_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete site settings" ON public.site_settings;
CREATE POLICY "Admins can delete site settings"
ON public.site_settings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Tompkins County values. Existing rows are left alone so re-running this
-- never overwrites an edit made in the table editor.
INSERT INTO public.site_settings (key, label, phone, url) VALUES
  ('snap_contact',     'Tompkins County DSS',      '(607) 274-5680', 'https://www.tompkinscountyny.gov/All-Departments/Social-Services'),
  ('medicaid_contact', 'Human Services Coalition', '(607) 211-8667', 'https://hsctc.org/stayinsured/'),
  ('nysoh_phone',      'NY State of Health',       '1-855-355-5777', NULL),
  ('medicaid_tool',    'NY State of Health tool',  NULL,             'https://info.nystateofhealth.ny.gov/medicaid-requirements-tool'),
  ('nydocsubmit_info', 'NYDocSubmit information',  NULL,             'https://otda.ny.gov/programs/nydocsubmit'),
  ('mybenefits',       'NYS myBenefits',           NULL,             'https://www.mybenefits.ny.gov/mybenefits/begin')
ON CONFLICT (key) DO NOTHING;
