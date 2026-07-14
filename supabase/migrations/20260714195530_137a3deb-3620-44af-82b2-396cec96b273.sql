
-- Update scheduled jobs to include the trusted internal caller header
DO $$
DECLARE
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vc3hvcG54YWl2ZmR0a3NydmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzUzMDMsImV4cCI6MjA3ODExMTMwM30.1yZWts4QXnk62OUnbBe1-MCm67LmFcFfZBxxj_uFQCc';
  internal_secret text := '3a9f7c2d4e6b8a1c5d7e9f0a2b4c6d8e0f1a3b5c7d9e1f2a4b6c8d0e2f4a6b8c';
  headers text := format('{"Content-Type":"application/json","Authorization":"Bearer %s","x-internal-task-secret":"%s"}', anon_key, internal_secret);
  rec record;
BEGIN
  FOR rec IN SELECT jobid, jobname, command FROM cron.job WHERE jobname IN (
    'scrape-tompkins-chamber','scrape-ithaca-civil','scrape-tompkins-civil',
    'scrape-cornell','scrape-ithaca-college','scrape-tc3','recheck-manual-jobs-daily'
  ) LOOP
    -- Replace the headers JSON literal in the command with the new one that includes the internal secret
    PERFORM cron.alter_job(
      job_id := rec.jobid,
      command := regexp_replace(
        rec.command,
        E'headers:=''\\{[^\\}]*\\}''::jsonb',
        format('headers:=%L::jsonb', headers),
        'g'
      )
    );
  END LOOP;
END $$;
