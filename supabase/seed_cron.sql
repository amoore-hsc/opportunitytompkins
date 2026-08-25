-- ============================================================
-- Opportunity Board — Cron Job Schedules
-- ============================================================
-- Run this AFTER schema.sql and AFTER your scrape_sources are
-- populated. Replace placeholders with your Supabase project URL,
-- anon key, and INTERNAL_TASK_SECRET.
--
-- Schedules (UTC):
--   Weekly report         — Mon 13:00 (9:00 AM ET)
--   Listing reminder       — Mon 14:30 (10:30 AM ET)
--   Interest notification  — Mon 15:00 (11:00 AM ET)
--   Webhook test           — Mon 13:45 (9:45 AM ET)
--   Health check           — every hour
--   Scrapers               — daily ~11:00 UTC (7:00 AM ET), staggered
--   Recheck manual jobs     — daily 09:00 UTC (5:00 AM ET)
-- ============================================================

-- Replace these placeholders before running:
--   __PROJECT_URL__   → https://your-project.supabase.co
--   __ANON_KEY__      → your-anon-key
--   __INTERNAL_SECRET__ → your INTERNAL_TASK_SECRET value
--   Source IDs in the scrape jobs → your scrape_sources.id values

-- ── Weekly Report (Mon 9:00 AM ET = 13:00 UTC) ────────────
SELECT cron.schedule(
  'send-weekly-report',
  '0 13 * * 1',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/send-weekly-report',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;$$
);

-- ── Listing Reminder (Mon 10:30 AM ET = 14:30 UTC) ────────
SELECT cron.schedule(
  'send-listing-reminder-weekly',
  '30 14 * * 1',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/send-listing-reminder',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;$$
);

-- ── Interest Notification (Mon 11:00 AM ET = 15:00 UTC) ───
SELECT cron.schedule(
  'send-interest-notification-weekly',
  '0 15 * * 1',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/send-interest-notification',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;$$
);

-- ── Webhook Test (Mon 9:45 AM ET = 13:45 UTC) ─────────────
SELECT cron.schedule(
  'weekly-webhook-test',
  '45 13 * * 1',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/weekly-webhook-test',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;$$
);

-- ── Health Check (every hour) ─────────────────────────────
SELECT cron.schedule(
  'health-check-hourly',
  '0 * * * *',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/health-check',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__","x-internal-task-secret":"__INTERNAL_SECRET__"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;$$
);

-- ── Recheck Manual Jobs (daily 5:00 AM ET = 09:00 UTC) ────
SELECT cron.schedule(
  'recheck-manual-jobs-daily',
  '0 9 * * *',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/recheck-manual-jobs',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__","x-internal-task-secret":"__INTERNAL_SECRET__"}'::jsonb,
    body:='{"scheduled": true}'::jsonb
  ) AS request_id;$$
);

-- ── Job Scrapers (daily, staggered ~11:00 UTC / 7:00 AM ET) ─
-- Replace source_id values with your scrape_sources.id.
-- Remove sources you don't use, or add new ones following the same pattern.

SELECT cron.schedule(
  'scrape-chamber',
  '0 11 * * *',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/scrape-jobs',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__","x-internal-task-secret":"__INTERNAL_SECRET__"}'::jsonb,
    body:='{"source_id": "YOUR_SOURCE_ID_1"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'scrape-civil-service',
  '2 11 * * *',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/scrape-jobs',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__","x-internal-task-secret":"__INTERNAL_SECRET__"}'::jsonb,
    body:='{"source_id": "YOUR_SOURCE_ID_2"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'scrape-county-gov',
  '4 11 * * *',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/scrape-jobs',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__","x-internal-task-secret":"__INTERNAL_SECRET__"}'::jsonb,
    body:='{"source_id": "YOUR_SOURCE_ID_3"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'scrape-university-1',
  '6 11 * * *',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/scrape-jobs',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__","x-internal-task-secret":"__INTERNAL_SECRET__"}'::jsonb,
    body:='{"source_id": "YOUR_SOURCE_ID_4"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'scrape-university-2',
  '8 11 * * *',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/scrape-jobs',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__","x-internal-task-secret":"__INTERNAL_SECRET__"}'::jsonb,
    body:='{"source_id": "YOUR_SOURCE_ID_5"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'scrape-college',
  '10 11 * * *',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/scrape-jobs',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__","x-internal-task-secret":"__INTERNAL_SECRET__"}'::jsonb,
    body:='{"source_id": "YOUR_SOURCE_ID_6"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'scrape-health-system',
  '12 11 * * *',
  $$SELECT net.http_post(
    url:='__PROJECT_URL__/functions/v1/scrape-jobs',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer __ANON_KEY__","x-internal-task-secret":"__INTERNAL_SECRET__"}'::jsonb,
    body:='{"source_id": "YOUR_SOURCE_ID_7"}'::jsonb
  ) AS request_id;$$
);
