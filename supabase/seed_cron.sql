-- ============================================================
-- Opportunity Board — Cron Job Schedules
-- ============================================================
-- Run this in the Supabase SQL editor AFTER schema.sql and AFTER
-- your scrape_sources rows exist. Requires pg_cron, pg_net and
-- supabase_vault (all enabled by default on Supabase).
--
-- Before running, set the two values in the SETTINGS section below.
-- The script stops with an error if they still hold placeholders.
--
-- What it does:
--   1. Creates a random shared secret in Supabase Vault named
--      'internal_task_secret' (skipped if it already exists).
--   2. Schedules every job. Jobs read the secret from Vault at run
--      time, so the secret never appears in cron.job.
--   3. Schedules one scraper per active scrape_sources row,
--      two minutes apart starting at 11:00 UTC.
--
-- AFTER running: copy the secret from Dashboard → Integrations →
-- Vault → internal_task_secret, and save it as the Edge Function
-- secret INTERNAL_TASK_SECRET. The two must match, or the scrapers,
-- health check and webhook test are rejected with 401.
--
-- Schedules (UTC):
--   Weekly report          — Mon 13:00 (9:00 AM ET)
--   Webhook test           — Mon 13:45 (9:45 AM ET)
--   Listing reminder       — Mon 14:30 (10:30 AM ET)
--   Interest notification  — Mon 15:00 (11:00 AM ET)
--   Health check           — every hour
--   Recheck manual jobs    — daily 09:00 UTC (5:00 AM ET)
--   Scrapers               — daily from 11:00 UTC (7:00 AM ET), staggered
--
-- Re-running is safe: cron.schedule replaces jobs with the same name.
-- ============================================================

DO $$
DECLARE
  -- ── SETTINGS ───────────────────────────────────────────────
  project_url text := 'https://your-project.supabase.co';  -- Settings → API → Project URL
  anon_key    text := 'your-anon-key';                     -- Settings → API → anon / publishable key
  -- ───────────────────────────────────────────────────────────

  secret_expr constant text :=
    '(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''internal_task_secret'')';
  src record;
  minute int := 0;
  job_name text;
BEGIN
  IF project_url LIKE '%your-project%' OR anon_key = 'your-anon-key' THEN
    RAISE EXCEPTION 'Set project_url and anon_key in the SETTINGS section before running.';
  END IF;
  project_url := rtrim(project_url, '/');

  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'internal_task_secret') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'internal_task_secret',
      'Shared secret sent by pg_cron to edge functions. Must equal the INTERNAL_TASK_SECRET edge function secret.'
    );
  END IF;

  -- Helper: builds the command for one job.
  CREATE TEMP TABLE IF NOT EXISTS _seed_jobs (name text, schedule text, fn text, body jsonb) ON COMMIT DROP;
  TRUNCATE _seed_jobs;
  INSERT INTO _seed_jobs VALUES
    ('send-weekly-report',                '0 13 * * 1',  'send-weekly-report',         '{}'),
    ('weekly-webhook-test',               '45 13 * * 1', 'weekly-webhook-test',        '{}'),
    ('send-listing-reminder-weekly',      '30 14 * * 1', 'send-listing-reminder',      '{}'),
    ('send-interest-notification-weekly', '0 15 * * 1',  'send-interest-notification', '{}'),
    ('health-check-hourly',               '0 * * * *',   'health-check',               '{}'),
    ('recheck-manual-jobs-daily',         '0 9 * * *',   'recheck-manual-jobs',        '{"scheduled": true}');

  FOR src IN SELECT id, name FROM public.scrape_sources WHERE active ORDER BY created_at, name LOOP
    job_name := 'scrape-' || trim(both '-' from regexp_replace(lower(src.name), '[^a-z0-9]+', '-', 'g'));
    INSERT INTO _seed_jobs VALUES
      (job_name, format('%s 11 * * *', minute), 'scrape-jobs', jsonb_build_object('source_id', src.id));
    minute := minute + 2;
  END LOOP;

  FOR src IN SELECT * FROM _seed_jobs LOOP
    PERFORM cron.schedule(src.name, src.schedule, format(
$cmd$SELECT net.http_post(
    url:=%L,
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', %L,
      'x-internal-task-secret', %s
    ),
    body:=%L::jsonb
  ) AS request_id;$cmd$,
      project_url || '/functions/v1/' || src.fn, 'Bearer ' || anon_key, secret_expr, src.body::text));
  END LOOP;
END $$;

-- Check the result:
-- SELECT jobname, schedule FROM cron.job ORDER BY jobname;
