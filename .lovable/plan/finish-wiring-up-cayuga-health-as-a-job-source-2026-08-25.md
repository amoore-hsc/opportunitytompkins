# Finish wiring up Cayuga Health as a job source

## Current state (verified)

- Cayuga Health **is** in the list of scrape sources (`https://cayugahealth.org/careers/career-opportunities/`, marked active), so it was added.
- It has **never been scraped**: its last-scraped timestamp is empty, and there are **0 Cayuga Health job listings** in the database — that's why nothing shows on the Employment page.
- Every other source has a daily scheduled run (Chamber, Tompkins County, Ithaca Civil Service, Cornell University, Ithaca College, TC3, staggered 11:00–11:10 UTC). **Cayuga Health has no scheduled run at all**, so it was never picked up.

## Plan

1. Run the scraper manually against the Cayuga Health source only and inspect what comes back (job count, titles, whether each posting URL deep-links to the real job).
2. Depending on the result:
   - If the page yields clean listings, no code change is needed.
   - If the careers page is a wrapper around a hosted applicant-tracking widget (common for hospital systems), point the source at the underlying job board / API feed and add per-source config for the posting-URL pattern — same approach already used for Ithaca College's Oracle system.
3. Add a daily scheduled run for Cayuga Health, staggered after the existing ones (12 minutes past the hour) so it doesn't compete with the other sources.
4. Confirm the listings appear on the Find Employment Opportunities page with employer, location, and pay where available, and that pay enrichment picks up any postings missing a rate.

## Technical notes

- Source row lives in `scrape_sources`; the daily runs are `pg_cron` jobs invoking the `scrape-jobs` edge function with a `source_id` body.
- New cron job name: `scrape-cayuga-health`, schedule `12 11 * * *`, mirroring the existing job bodies (including the internal task secret header).
- If a hosted ATS is involved, the fix follows the existing `scrape_config` pattern (`api_type` / `posting_url_template`) in `supabase/functions/scrape-jobs/index.ts` rather than new one-off code paths.
