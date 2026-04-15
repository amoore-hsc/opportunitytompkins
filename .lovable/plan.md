

# Employment Opportunities Feature

## Overview
Add a new "Employment" opportunity type with a dedicated page, powered by scheduled web scraping from user-defined job posting sites, plus manual submission support.

## Architecture

```text
┌─────────────────┐     scheduled      ┌──────────────────┐
│  External Job   │ ──────────────────▶ │  Edge Function   │
│  Posting Sites  │    (pg_cron)        │  scrape-jobs     │
└─────────────────┘                     └────────┬─────────┘
                                                 │ insert/upsert
                                        ┌────────▼─────────┐
                                        │  employment_     │
                                        │  opportunities   │
                                        │  (new table)     │
                                        └────────┬─────────┘
                                                 │ query
                                        ┌────────▼─────────┐
                                        │  /employment     │
                                        │  (new page)      │
                                        └──────────────────┘
```

## Database Changes

**New table: `employment_opportunities`**
- `id` (uuid, PK)
- `job_title` (text, required)
- `employer` (text, required)
- `employment_type` (text, nullable — "Full-time", "Part-time", etc.)
- `wage` (text, nullable — free text like "$15/hr" or "$45,000/year")
- `location` (text, nullable)
- `posting_url` (text, required — link to original posting)
- `source_site` (text — which site it was scraped from)
- `source_id` (text, nullable — external ID for deduplication)
- `is_manual` (boolean, default false — distinguishes manual vs scraped entries)
- `active` (boolean, default true)
- `created_at`, `updated_at` (timestamptz)

RLS: public SELECT for active listings; admin INSERT/UPDATE/DELETE; service_role full access for the scraper.

**New table: `scrape_sources`** (admin-managed list of sites to scrape)
- `id` (uuid, PK)
- `name` (text — display name like "Indeed Ithaca")
- `url` (text — base URL or search URL to scrape)
- `scrape_config` (jsonb, nullable — CSS selectors, pagination rules, etc.)
- `active` (boolean, default true)
- `last_scraped_at` (timestamptz, nullable)
- `created_at` (timestamptz)

RLS: admin-only CRUD.

## Backend — Edge Function: `scrape-jobs`

- Reads active entries from `scrape_sources`
- For each source, fetches the page HTML and parses job listings using configurable selectors (stored in `scrape_config`)
- Extracts: job title, employer, employment type, wage, location, posting URL
- Upserts into `employment_opportunities` using `source_site` + `source_id` for deduplication
- Marks listings no longer found as inactive (optional staleness logic)

**Scraping approach**: Use Firecrawl connector (already available) for reliable HTML fetching, or direct `fetch` + regex/DOM parsing depending on the sites. Firecrawl would handle JS-rendered pages better.

**Schedule**: Set up a `pg_cron` job to invoke the edge function daily (configurable).

## Frontend Changes

1. **New page: `/employment`** — dedicated Employment Opportunities page
   - Card-based layout showing job title, employer, type, wage, location
   - Each card links out to the full posting URL ("View Full Posting" button)
   - Filters: employment type (full/part-time), location
   - Consistent header/branding with the existing Opportunities page

2. **Navigation**: Add link to Employment page from the home page and/or the Opportunities page header

3. **Admin panel additions**:
   - Section to manage `scrape_sources` (add/edit/remove source sites with their URLs and selectors)
   - View/manage employment listings (activate/deactivate, manual add)
   - Manual submission form for employment opportunities

4. **Manual submission**: A form (admin-only or public, depending on preference) to add employment listings manually with the same fields.

## Implementation Order

1. Create `employment_opportunities` and `scrape_sources` tables with RLS
2. Build the `/employment` frontend page with card layout and filters
3. Build the `scrape-jobs` edge function with Firecrawl or direct fetch
4. Set up `pg_cron` daily schedule
5. Add admin panel sections for managing sources and listings
6. Add manual submission form
7. Add navigation links

## Technical Notes

- The scrape config per source will need to be tuned per-site (CSS selectors differ). We'll start with a generic structure and refine once you share the specific sites.
- Employment listings are stored in a separate table (not the existing `opportunities` table) to keep the schema clean — employment has different fields (wage, employment type, posting URL) vs volunteer/education.

