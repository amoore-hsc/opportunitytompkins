## Goal

Replace the "Contact us" mailto link at the bottom of the Employment page with a self-service flow that lets anyone submit a job posting URL. Submitted jobs flow into the existing `employment_opportunities` table, get scraped/classified by Firecrawl + Lovable AI, are validated as real job postings, and become visible on the public site. Admins get a dedicated section to monitor and remove these user-submitted jobs.

## User flow

1. On `/employment`, footer link changes to "Submit a job posting" → opens a modal.
2. Modal asks for: posting URL, employer name (optional), submitter email (required, for follow-up only — not stored on listing).
3. On submit, a new public edge function `submit-job-posting` (verify_jwt = false):
  - Validates URL with zod.
  - Calls Firecrawl scrape (single URL, JSON format) to extract job_title, employer, location, wage, employment_type.
  - Validates the page actually looks like a job posting (must have a job_title and either employer or wage; reject if extraction returns nothing usable).
  - Classifies category via Lovable AI (`google/gemini-2.5-flash-lite`), reusing the same category list as `scrape-jobs`.
  - Inserts into `employment_opportunities` with `is_manual = true`, `source_site = 'user-submitted'`, `source_id = <submission id>`, `active = true`.
  - Returns success/failure to the modal.
4. The job appears immediately on `/employment` like any other listing.

## Recurring re-check (auto-remove when posting comes down)

The existing `scrape-jobs` function only scrapes rows in `scrape_sources`. We extend the daily routine to also re-check user-submitted jobs:

- New edge function `recheck-manual-jobs` (verify_jwt = false), scheduled daily via `pg_cron`:
  - Loads all `employment_opportunities` where `is_manual = true AND source_site = 'user-submitted' AND active = true`.
  - For each, scrapes the `posting_url` with Firecrawl.
  - If the page returns 404, redirects to a careers index, or no longer extracts a job_title → set `active = false` (treated as "posting taken down").
  - If still valid → refresh job_title/wage/location/employment_type and bump `updated_at`.

This satisfies "scrape just that job until the posting comes down, in which case it removes it" without mixing user-submitted single-URL jobs into the `scrape_sources` table (which is designed for listing pages, not single postings).

## Admin dashboard

Add a new "User-Submitted Jobs" section to `/admin` (above or alongside existing sections):

- Table of all `employment_opportunities` where `is_manual = true AND source_site = 'user-submitted'`, newest first.
- Columns: Job Title, Employer, Posting URL (external link icon), Submitted (relative date), Last Checked (`updated_at`), Status (Active / Removed), Actions.
- Actions per row: "View on site" (opens posting URL), "Deactivate" (sets `active = false`), "Delete" (hard delete from table).
- "Re-check now" button that calls `recheck-manual-jobs` on demand.

## Database

No schema changes needed — `employment_opportunities` already has `is_manual`, `source_site`, `source_id`, `active`, `updated_at`. RLS already allows public SELECT on active rows and admin full access.

One small migration: add a public INSERT policy scoped to `is_manual = true AND source_site = 'user-submitted' AND active = true` so the edge function (called anonymously) can write via service role — actually the edge function uses the service role key, so no RLS change is required. Skip the migration.

## Cron schedule

Use the user-data insert tool (per project rules) to register a daily `pg_cron` job that POSTs to `recheck-manual-jobs` once per day (e.g., 4:00 AM ET = 09:00 UTC), staggered away from the existing scrape-jobs schedule.

## Files

**New**

- `supabase/functions/submit-job-posting/index.ts` — validate URL, Firecrawl scrape, AI classify, insert row.
- `supabase/functions/recheck-manual-jobs/index.ts` — daily re-validation of user-submitted jobs.
- `src/components/SubmitJobDialog.tsx` — modal with URL + optional employer + optional email, submit handler invoking `submit-job-posting`.

**Edited**

- `src/pages/Employment.tsx` — replace footer mailto with "Submit a job posting" button that opens `SubmitJobDialog`.
- `src/pages/Admin.tsx` — add "User-Submitted Jobs" section with table, deactivate/delete actions, and "Re-check now" button.
- `supabase/config.toml` — register `submit-job-posting` and `recheck-manual-jobs` with `verify_jwt = false`.

**Cron (via insert tool, not migration)**

- Schedule `recheck-manual-jobs` daily at 09:00 UTC.

## Validation rules (anti-spam)

- URL must be valid HTTPS, max 2048 chars.
- Firecrawl extraction must return a non-empty `job_title`.
- Reject if `posting_url` already exists in `employment_opportunities`.
- Optional submitter email validated with zod `.email()` if provided; logged to function logs only (not stored).

## Out of scope

- No moderation queue (jobs go live immediately; admin can remove).
- No email notification to submitter.
- No edits to `scrape_sources` table — user-submitted jobs are handled by their own re-check function.