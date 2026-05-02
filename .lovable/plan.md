## Plan: Backfill missing wages by scraping each posting's detail page

### What's actually happening
I checked the database and the live pages — the issue isn't PDFs. There are **zero** posting URLs ending in `.pdf` in the database. The real cause: the scraper only reads the **index/listing page** for each source. Many sources (Tompkins County Civil Service, Ithaca Civil Service Portal, Cornell Workday, TC3) only show the wage on the **individual job detail page** that the listing links to.

Examples I verified:
- `tompkinscivilservice.org/civilservice/post/9285` → "SALARY: 18.99" (visible on detail page, missing in DB)
- `ithaca-portal.mycivilservice.com/default/show_accountment/47472` → "Salary: $97,217 - $116,660" (visible on detail page, missing in DB)
- Cornell Workday pages are JavaScript-rendered, so wage data isn't in the index extract

Current "no wage" counts: Cornell 76/76, Ithaca College 440/490, Tompkins County 71/91, TC3 27/31, Ithaca Civil Service 23/27, Tompkins Chamber 7/36.

### What we'll build

**1. New "wage enrichment" step in `scrape-jobs` edge function**

After the index scrape and AI category classification, for any job that ended up with `wage = null`, do a second Firecrawl scrape against `posting_url` to extract just the wage. To keep cost/time reasonable:
- Only enrich jobs where wage is null AND the posting_url is on a different domain/path than the index page (i.e. it's a real detail page, not the same index)
- Cap at ~25 enrichments per source per run (configurable) so a fresh source doesn't burn hundreds of Firecrawl credits in one shot
- Run enrichments with small concurrency (e.g. 3 at a time) using `Promise.all` batches
- Use Firecrawl v2 `scrape` with `formats: [{ type: 'json', schema: { wage: string|null } }]`, `onlyMainContent: true`, `waitFor: 3000` (handles Workday's JS render)
- If the detail scrape returns a wage string, update that row's `wage` column. If null/empty, leave it alone.

**2. One-time backfill**

After deploying, invoke `scrape-jobs` once per source so the new enrichment pass runs against the existing ~661 active listings with null wages. Because of the per-run cap, the largest sources (Cornell, Ithaca College) may need 2–3 manual triggers from the Admin page to fully backfill. I'll note this in the response.

### What we're NOT changing
- Listing index scrape logic stays the same
- Job category classification stays the same
- No new DB columns
- Daily cron schedule unchanged — enrichment just adds time to each scheduled run

### Technical details
- File: `supabase/functions/scrape-jobs/index.ts` only
- New helper `enrichWageFromPostingUrl(url): Promise<string|null>` calling Firecrawl v2 scrape with a tight JSON schema + prompt: "Extract the salary, wage, or pay range exactly as shown (e.g. '$18.99/hr', '$50,000 - $60,000/year'). If not present, return null."
- New helper loop after the existing upsert block, scoped to jobs from this source missing wage
- Updates run via `supabase.from('employment_opportunities').update({ wage }).eq('id', id)`
- Per-source cap: `MAX_WAGE_ENRICHMENTS_PER_RUN = 25`
- Concurrency: process 3 URLs at a time
- Errors per URL are logged and skipped (don't fail the whole run)

### Risk / cost note
Each enrichment = 1 extra Firecrawl scrape credit. With the 25/source cap and 6 sources, worst case ~150 extra credits per scheduled run, but most runs will be much smaller because most jobs already have a wage after backfill completes — only newly-added jobs trigger enrichment.
