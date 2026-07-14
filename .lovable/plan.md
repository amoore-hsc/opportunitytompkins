Change the stale employment listing deactivation window from 14 days to 7 days.

## What
In `supabase/functions/scrape-jobs/index.ts`, the scraper currently marks active non-manual jobs as inactive if they have not been seen in 14 days. This prevents partial scrapes from hiding legitimate jobs on paginated sites like Cornell Workday or Tompkins Chamber. I will reduce that window to 7 days so stale/removed postings disappear faster.

## How
- Update the `14 * 24 * 60 * 60 * 1000` calculation to `7 * 24 * 60 * 60 * 1000`.
- Update the comment from "14+ days" / "2 weeks" to "7+ days" / "1 week" to match the new logic.
- Deploy the updated edge function so the change takes effect on the next scrape run.

## Risk note
A shorter window is more aggressive. If a source like Cornell or the Chamber has a partial scrape or a one-off failure, active jobs could be deactivated after a week. Recheck logic for user-submitted/manual jobs is unaffected.

## Technical detail
File: `supabase/functions/scrape-jobs/index.ts`, lines 494–512.
No database schema changes are needed.