## Problem

Every Ithaca College job in the database has the same `posting_url`:
`https://ehwy.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=location`

That's the listings page, not the individual posting. So clicking "View Job Posting" dumps the user into the full search instead of the role they wanted.

**Why it's happening:** Ithaca College's careers site is an Oracle Cloud HCM single-page app. Firecrawl renders the page, but the per-job links use a hash/JavaScript router. The AI extractor can't see clean per-job hrefs, so it falls back to the source URL for every row.

The good news: Oracle HCM postings have a stable canonical URL pattern:
`https://ehwy.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/<REQUISITION_ID>`

The requisition ID is visible on each listing card (e.g. `REQ-1234`). If we capture it, we can reconstruct the correct posting URL.

## Plan

### 1. Add a per-source URL template to `scrape_sources.scrape_config`

`scrape_config` is already a flexible JSON column. Add (via migration):

```json
{ "posting_url_template": "https://ehwy.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/{source_id}" }
```

…on the Ithaca College row only. Other sources are unaffected.

### 2. Strengthen the extractor prompt in `supabase/functions/scrape-jobs/index.ts`

Tighten the wording so Firecrawl's JSON extractor reliably pulls the requisition number into `source_id`. Today's prompt is generic; we'll explicitly call out "requisition number / job ID / alphanumeric identifier shown on the card" so Oracle's `REQ-XXXX` IDs come through.

### 3. Apply the template when posting URL collapsed to the source URL

In the per-job loop (around line 273):

```text
if posting_url is missing OR equals the source listings URL:
    if scrape_config.posting_url_template AND source_id:
        posting_url = template.replace("{source_id}", source_id)
```

This is a generic mechanism — any future SPA careers site can be fixed the same way by just adding a template to its `scrape_config`.

### 4. Backfill existing Ithaca College rows

One-time UPDATE migration: for every existing Ithaca College row that has a non-null `source_id` and the broken listings URL, rewrite `posting_url` using the template. Rows without a captured `source_id` will be corrected on the next nightly scrape.

### 5. Trigger one fresh scrape of Ithaca College

After deploy, invoke `scrape-jobs` for just the Ithaca College source so any rows missing `source_id` get re-extracted with the new prompt.

## Files to change

- `supabase/functions/scrape-jobs/index.ts` — stronger prompt, apply `posting_url_template` fallback
- New migration — set `scrape_config` for Ithaca College + backfill existing posting URLs

## Risk / fallback

If the AI still can't extract a requisition ID for a particular job, that row keeps the listings URL (today's behavior) — no regression. We can iterate on a second source-specific HTML scrape later if needed.
