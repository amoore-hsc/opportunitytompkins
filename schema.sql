-- ============================================================
-- Opportunity Board — Consolidated Schema
-- ============================================================
-- Run this in the Supabase SQL editor to create the full schema.
-- This represents the final state of all migrations.
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ── Enum ────────────────────────────────────────────────────
CREATE TYPE public.app_role AS ENUM ('admin');

-- ════════════════════════════════════════════════════════════
-- Tables
-- ════════════════════════════════════════════════════════════

-- ── Opportunities (volunteer / training / educational) ──────
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  org_name TEXT NOT NULL,
  org_email TEXT NOT NULL,
  org_phone TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  hours_available TEXT NOT NULL,
  days_times_available TEXT NOT NULL,
  on_bus_route BOOLEAN NOT NULL DEFAULT false,
  additional_requirements TEXT,
  contact_name TEXT,
  position_title TEXT,
  role_classification TEXT,
  edit_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reminder_sent_at TIMESTAMPTZ,
  interest_notification_sent_at TIMESTAMPTZ,
  positions_filled INTEGER,
  removal_reason TEXT,
  admin_contact_name TEXT,
  admin_email TEXT,
  program_name TEXT,
  program_components TEXT,
  website TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  manual_reminder_count INTEGER NOT NULL DEFAULT 0,
  last_manual_reminder_at TIMESTAMPTZ
);

-- ── User Roles ─────────────────────────────────────────────
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- ── Application Counts (aggregated, no PII) ─────────────────
CREATE TABLE public.application_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Employment Opportunities (scraped jobs) ────────────────
CREATE TABLE public.employment_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title TEXT NOT NULL,
  employer TEXT NOT NULL,
  employment_type TEXT,
  wage TEXT,
  location TEXT,
  posting_url TEXT NOT NULL,
  source_site TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  job_category TEXT,
  wage_checked_at TIMESTAMPTZ,
  special_requirements TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_site, source_id)
);

-- ── Scrape Sources ─────────────────────────────────────────
CREATE TABLE public.scrape_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  scrape_config JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Feedback Submissions ───────────────────────────────────
CREATE TABLE public.feedback_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 5 AND 4000),
  submitter_name TEXT CHECK (submitter_name IS NULL OR char_length(submitter_name) <= 200),
  submitter_email TEXT CHECK (submitter_email IS NULL OR char_length(submitter_email) <= 320),
  page_path TEXT CHECK (page_path IS NULL OR char_length(page_path) <= 500),
  user_agent TEXT CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Client Errors (browser-side error logging) ────────────
CREATE TABLE public.client_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  path TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- Functions
-- ════════════════════════════════════════════════════════════

-- Check if a user has a specific role (SECURITY DEFINER, bypasses RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Auto-update updated_at on row change (preserves timestamp for reminder-only updates)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Allow explicit administrative timestamp corrections when updated_at is the only changed field.
    IF (
      (to_jsonb(OLD) - 'updated_at') IS NOT DISTINCT FROM (to_jsonb(NEW) - 'updated_at')
      AND NEW.updated_at IS DISTINCT FROM OLD.updated_at
    ) THEN
      RETURN NEW;
    END IF;

    -- If the only changed columns are reminder-tracking fields, preserve updated_at.
    IF (
      to_jsonb(OLD) - '{manual_reminder_count,last_manual_reminder_at,reminder_sent_at,updated_at}'::text[]
    ) IS DISTINCT FROM (
      to_jsonb(NEW) - '{manual_reminder_count,last_manual_reminder_at,reminder_sent_at,updated_at}'::text[]
    ) THEN
      NEW.updated_at = now();
    ELSE
      NEW.updated_at = OLD.updated_at;
    END IF;
  ELSE
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Validate and sanitize opportunity inserts (SECURITY DEFINER so role checks work for anon)
CREATE OR REPLACE FUNCTION public.validate_opportunity_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF length(coalesce(NEW.org_name, '')) > 200 THEN
    RAISE EXCEPTION 'org_name too long';
  END IF;
  IF length(coalesce(NEW.description, '')) > 5000 THEN
    RAISE EXCEPTION 'description too long';
  END IF;
  IF length(coalesce(NEW.position_title, '')) > 200 THEN
    RAISE EXCEPTION 'position_title too long';
  END IF;
  IF length(coalesce(NEW.location, '')) > 300 THEN
    RAISE EXCEPTION 'location too long';
  END IF;
  IF length(coalesce(NEW.additional_requirements, '')) > 3000 THEN
    RAISE EXCEPTION 'additional_requirements too long';
  END IF;

  IF NEW.org_email IS NOT NULL
     AND NEW.org_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'org_email is not a valid email address';
  END IF;

  -- Public submitters must not preset internal bookkeeping fields.
  -- Service role and admins bypass this via the role check.
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.edit_token := gen_random_uuid();
    NEW.active := true;
    NEW.reminder_sent_at := NULL;
    NEW.deactivated_at := NULL;
    NEW.positions_filled := NULL;
    NEW.removal_reason := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.validate_opportunity_insert() FROM PUBLIC, anon, authenticated;

-- ════════════════════════════════════════════════════════════
-- Triggers
-- ════════════════════════════════════════════════════════════

CREATE TRIGGER validate_opportunity_insert_trg
BEFORE INSERT ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.validate_opportunity_insert();

CREATE TRIGGER update_opportunities_updated_at
BEFORE UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employment_opportunities_updated_at
BEFORE UPDATE ON public.employment_opportunities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_submissions_updated_at
BEFORE UPDATE ON public.feedback_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ════════════════════════════════════════════════════════════
-- View
-- ════════════════════════════════════════════════════════════

-- Public-safe view of active opportunities (no edit_token, org_email, phone, admin fields).
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

-- ════════════════════════════════════════════════════════════
-- Enable Row-Level Security
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════
-- Grants
-- ════════════════════════════════════════════════════════════

-- Opportunities: anon can INSERT only; authenticated gets column-scoped SELECT + full CRUD
GRANT INSERT ON public.opportunities TO anon;
REVOKE SELECT ON public.opportunities FROM anon;
GRANT SELECT (
  id, org_name, position_title, program_name, program_components, description,
  location, days_times_available, hours_available, on_bus_route,
  additional_requirements, role_classification, type, website,
  created_at, updated_at, active
) ON public.opportunities TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;

-- Public view
GRANT SELECT ON public.public_opportunities TO anon, authenticated;
GRANT ALL ON public.public_opportunities TO service_role;

-- User roles
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Application counts
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_counts TO authenticated;
GRANT ALL ON public.application_counts TO service_role;

-- Employment opportunities
GRANT SELECT ON public.employment_opportunities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employment_opportunities TO authenticated;
GRANT ALL ON public.employment_opportunities TO service_role;

-- Scrape sources
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrape_sources TO authenticated;
GRANT ALL ON public.scrape_sources TO service_role;

-- Feedback
GRANT INSERT ON public.feedback_submissions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.feedback_submissions TO authenticated;
GRANT ALL ON public.feedback_submissions TO service_role;

-- Client errors
GRANT INSERT ON public.client_errors TO anon;
GRANT INSERT, SELECT, DELETE ON public.client_errors TO authenticated;
GRANT ALL ON public.client_errors TO service_role;

-- Function execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════
-- RLS Policies
-- ════════════════════════════════════════════════════════════

-- ── Opportunities ──────────────────────────────────────────
CREATE POLICY "Anyone can view active opportunities"
ON public.opportunities FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "Anyone can create opportunities"
ON public.opportunities FOR INSERT
TO anon, authenticated
WITH CHECK (
  org_name IS NOT NULL
  AND org_email IS NOT NULL
  AND description IS NOT NULL
  AND type IN ('volunteer','education')
);

CREATE POLICY "Admins can view all opportunities"
ON public.opportunities FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update opportunities"
ON public.opportunities FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete opportunities"
ON public.opportunities FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ── User Roles ─────────────────────────────────────────────
CREATE POLICY "Admins can view user_roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ── Application Counts ─────────────────────────────────────
CREATE POLICY "Admins can view application_counts"
ON public.application_counts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage application_counts"
ON public.application_counts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ── Employment Opportunities ──────────────────────────────
CREATE POLICY "Anyone can view active employment opportunities"
ON public.employment_opportunities FOR SELECT
TO anon, authenticated
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
TO service_role
USING (true)
WITH CHECK (true);

-- ── Scrape Sources ────────────────────────────────────────
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
TO service_role
USING (true)
WITH CHECK (true);

-- ── Feedback Submissions ──────────────────────────────────
CREATE POLICY "Anyone can submit feedback"
ON public.feedback_submissions FOR INSERT
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

CREATE POLICY "Admins can view feedback"
ON public.feedback_submissions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update feedback"
ON public.feedback_submissions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete feedback"
ON public.feedback_submissions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ── Client Errors ─────────────────────────────────────────
CREATE POLICY "Anyone can report a client error"
ON public.client_errors FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(coalesce(message, '')) BETWEEN 1 AND 2000
  AND length(coalesce(stack, '')) <= 8000
  AND length(coalesce(path, '')) <= 500
  AND length(coalesce(user_agent, '')) <= 500
);

CREATE POLICY "Admins can view client errors"
ON public.client_errors FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete client errors"
ON public.client_errors FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ════════════════════════════════════════════════════════════
-- Indexes
-- ════════════════════════════════════════════════════════════

CREATE INDEX idx_feedback_submissions_created_at ON public.feedback_submissions (created_at DESC);
CREATE INDEX idx_client_errors_created_at ON public.client_errors (created_at DESC);
