# Opportunity Board

A configurable community opportunity board for SNAP ABAWD work-requirement compliance,
volunteer/training/educational opportunity listings, and local job aggregation.

Originally built for **Tompkins County, NY** as "Tompkins Opportunity" and generalized
into a reusable template. Fork this repo, set your config, and deploy your own
county-level opportunity board.

## Features

- **Volunteer / Training / Educational Opportunities** — Community organizations post
  listings; the public browses, filters, and applies. Listings auto-expire after 60 days
  with email reminders, and can be deactivated/reactivated via magic-link tokens.
- **Employment Opportunities** — Daily automated scraping of local job sites (Cornell
  University, Ithaca College, Tompkins Chamber, Cayuga Health, Tompkins County government).
  AI-powered job-category classification and wage enrichment. Multi-select category pills,
  pay slider, employer filter, and print/email sharing.
- **Admin Dashboard** — Aggregate reporting, listing management, feedback review, manual
  reminder sending, stale-listing alerts, and dashboard export (PDF/Excel).
- **Automated Emails** — Listing confirmations, application notifications, weekly reports,
  60-day reminders, interest notifications, deactivation/reactivation emails.
- **Accessibility** — WCAG 2.1 AA targeted: skip links, ARIA landmarks, screen-reader-only
  labels, high-contrast design.

## Tech Stack

- **Frontend:** React 18, Vite 5, TypeScript 5, Tailwind CSS v3, shadcn/ui
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Storage)
- **Email:** Resend
- **AI:** Lovable AI Gateway (job categorization, wage extraction)
- **Scraping:** Firecrawl

## Quick Start

### 1. Clone & install

```sh
git clone <your-repo-url> opportunity-board
cd opportunity-board
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Run the schema migration: `supabase/migrations/schema.sql` (in the SQL editor).
3. Optionally run the cron seed: `supabase/migrations/seed_cron.sql`.
4. Copy your project URL, anon key, and project ID from Settings → API.

### 3. Configure environment variables

```sh
cp .env.example .env
```

Edit `.env` with your Supabase credentials and other config values.

### 4. Configure frontend site settings

```sh
cp src/config/site.config.local.example.ts src/config/site.config.local.ts
```

Edit `src/config/site.config.local.ts` with your county name, support email,
verification form URLs, career center info, and county place lists.

The color palette is defined as HSL tokens in `src/index.css` — customize the
`--primary`, `--secondary`, and accent values to match your brand.

### 5. Set Edge Function secrets

In your Supabase dashboard (Project Settings → Edge Functions → Secrets), add:
`RESEND_API_KEY`, `FIRECRAWL_API_KEY`, `LOVABLE_API_KEY`, `INTERNAL_TASK_SECRET`,
`FROM_EMAIL`, `FROM_NAME`, `SUPPORT_EMAIL`, `ALERT_RECIPIENTS`, `SITE_NAME`,
`SITE_URL`, `COUNTY_PLACES`, `OUT_OF_COUNTY_BLOCKLIST`, `OUT_OF_STATE_REGIONS`,
and optionally `GOOGLE_CHAT_WEBHOOK_URL`.

### 6. Deploy Edge Functions

```sh
supabase functions deploy --no-verify-jwt
```

Or deploy individual functions from `supabase/functions/`.

### 7. Run the dev server

```sh
npm run dev
```

## Architecture

```
src/
  config/           # Site configuration (defaults + local override)
    site.config.ts          # Neutral placeholder defaults (committed)
    site.config.local.ts    # Your county values (gitignored)
    site.config.local.example.ts
    index.ts                # Config loader
  pages/            # Route pages (Index, Opportunities, Employment, Admin, etc.)
  components/        # Reusable UI components
  lib/              # Utilities (jobLocation, confetti, errorReporting)
  integrations/      # Supabase client (auto-generated)

supabase/
  functions/         # Edge Functions (emails, scraping, feedback, health check)
    _shared/         # Shared helpers (emailConfig, googleChat, jobLocation, wage)
  migrations/       # SQL schema and cron schedules
```

## Customization Guide

### Brand colors
Edit HSL tokens in `src/index.css` (`--primary`, `--secondary`, `--highlight`, etc.).

### Site name, emails, county info
Edit `src/config/site.config.local.ts`.

### Job scraper sources
The scraper in `supabase/functions/scrape-jobs/index.ts` has source-specific
fetchers (ApplicantPro sitemaps, Oracle REST APIs, Firecrawl page scrapes).
Adapt these for your local employers, or remove sources you don't need.

### Verification forms
Set `verificationForms` in `site.config.local.ts` with your own Adobe Acrobat /
Google Form / portal links.

### Cron schedules
Edit `supabase/migrations/seed_cron.sql` to set your own schedule, then run it
in the Supabase SQL editor. Requires the `pg_cron` extension.

## License

MIT — see [LICENSE](LICENSE).
