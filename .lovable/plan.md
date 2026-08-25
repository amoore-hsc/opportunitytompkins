# Plan: Publish a Generic "Opportunity Board" Template to GitHub

## Goal
Turn this Tompkins-specific codebase into a reusable, config-driven template and publish it to a **new public GitHub repo**. The live Tompkins site keeps running unchanged (Tompkins values live in a gitignored local override). Other counties/orgs fork the repo, fill in one config file + env vars, and deploy.

## Approach: config-driven, two layers
- **Public repo ships neutral placeholders** in `src/config/site.config.ts` (e.g. `siteName: "Opportunity Board"`, `countyName: "[Your County]"`, placeholder emails/forms).
- **Live Tompkins site keeps its real values** in a new gitignored `src/config/site.config.local.ts` that overrides the defaults. The live site renders Tompkins; the public repo never exposes Tompkins contact data, DSS links, or form URLs.
- This makes two-way git sync safe: the repo always contains neutral defaults; the local override never commits.

## Work items

### 1. Frontend config layer
- Create `src/config/site.config.ts` — single source of truth with neutral defaults for: `siteName`, `countyName`, `colors` (navy/lime accents), `fromEmail`, `supportEmail`, `alertEmails`, `dssName`/`dssUrl`/`dssPhone`, `exemptionFormUrl`, `verificationForms` (array of {label, url, icon}), `employmentResources` (array of {title, url, desc, icon}), `logos`, `socialServiceAgency` label, `countyPlaces` + `outOfCountyBlocklist` (for job-location filtering).
- Create `src/config/site.config.local.ts` (gitignored) holding the real Tompkins values, loaded via a `loadSiteConfig()` helper that merges local over defaults.
- Replace every hardcoded Tompkins reference in: `Index.tsx`, `Opportunities.tsx`, `ListOpportunity.tsx`, `EditOpportunity.tsx`, `Employment.tsx`, `EmploymentResources.tsx`, `Admin.tsx`, `ElectronicVerificationForms.tsx`, `PrintableOpportunities.tsx`, `SubmitJobDialog.tsx`, `DashboardExport.tsx`, `index.html` (title/meta), `index.css` (color tokens read from config), `lib/jobLocation.ts` (county place lists).
- Ship `site.config.local.example.ts` showing the structure with Tompkins as a worked example.

### 2. Edge function config layer (env-driven)
Edge functions currently hardcode `from: "Tompkins Opportunity <hello@tompkins-opportunity.org>"` and recipient emails (`amoore@hsctc.org`, `rhinton@uwtc.org`, `cwilcox@hsctc.org`). Replace with env vars (falling back to neutral placeholders):
- `FROM_EMAIL`, `FROM_NAME`, `SUPPORT_EMAIL`, `ALERT_RECIPIENTS` (comma list), `SITE_NAME`, `SITE_URL`.
- Update all ~18 functions: `send-confirmation-email`, `send-application-email`, `send-listing-reminder`, `send-interest-notification`, `send-weekly-report`, `send-deactivation-email`, `send-reactivation-email`, `send-opportunities-email`, `send-jobs-email`, `submit-feedback`, `health-check`, `test-listing-reminder`.
- Add a shared `_shared/emailConfig.ts` helper so every function reads sender/recipient/site config in one place.

### 3. Secrets & env documentation
- Create `.env.example` (frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` as placeholders).
- Create `supabase/.env.example` (edge function secrets: `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SITE_URL`, `INTERNAL_TASK_SECRET`, `ADMIN_TASK_SECRET`, `FIRECRAWL_API_KEY`, `GOOGLE_CHAT_WEBHOOK_URL`, and the AI provider key used by job categorization/wage enrichment).
- `.gitignore`: ensure `.env`, `supabase/.env`, `src/config/site.config.local.ts` are never committed. Audit existing files for any committed secrets.

### 4. Schema + cron (consolidated, fresh-install)
- Consolidate the 41 migrations into a clean `supabase/schema.sql`: all tables (`opportunities`, `application_counts`, `employment_opportunities`, `scrape_sources`, `feedback_submissions`, `client_errors`, `user_roles`), the `public_opportunities` view, `has_role()` function, RLS policies, and GRANTs — generic (no Tompkins data rows).
- Create `supabase/seed_cron.sql` with the pg_cron schedules (weekly report Mon 9:00, listing reminder 9:30, interest notification 10:00, hourly health-check, weekly webhook test), parameterized so the function URLs use `${PROJECT_URL}`/placeholder the deployer fills in.
- Keep `scrape_sources` empty (no employer sources) — other counties add their own.

### 5. Assets & branding
- Replace Tompkins-specific logos (`chrn-logo.jpg`, `foodbank-logo.png`, `workforce-ny-logo.png`, county favicon) with placeholder slots + a `public/` swap guide in the README.
- Keep a neutral default favicon; document how to drop in a county logo/favicon.

### 6. Documentation
- Rewrite `README.md` as a setup guide: prerequisites (Node, Supabase project, Resend, Firecrawl, optional AI key + Google Chat), step-by-step (`cp .env.example .env`, fill config, run schema.sql + seed_cron.sql, deploy edge functions, `npm run dev`), config reference, deployment.
- Add `LICENSE` (MIT, copyright "Tompkins Opportunity contributors").
- Add `docs/CONFIG.md` enumerating every config knob.

### 7. GitHub repo (needs your action)
This project isn't connected to GitHub yet. After the code is generalized:
1. In the Lovable editor: **Plus (+) menu → GitHub → Connect project**.
2. Authorize the Lovable GitHub App on GitHub.
3. Pick the GitHub account/organization and create a **new public** repo (suggested name: `opportunity-board`).
4. Lovable pushes the generalized code (neutral defaults) to the repo.
5. Because Lovable uses two-way sync, community PRs would flow back to this live project. To keep the live Tompkins site isolated, after the initial push I recommend disconnecting the sync (Project > Settings > Git) so the public repo evolves independently, and re-syncing only when you intentionally publish updates.

## What I need from you
1. **GitHub authorization**: when you're ready, use Plus (+) menu → GitHub → Connect project, authorize the app, and create the new public repo (pick the account/org + repo name).
2. **License**: I'll ship MIT — tell me if you prefer another (Apache-2.0, etc.).
3. **Repo name**: I'll assume `opportunity-board` unless you specify.
4. Confirm the **neutral-defaults approach** (recommended) so the public template never exposes Tompkins contact data — vs. shipping Tompkins as the worked example.

## Scope notes / out of scope
- Scraper **source data** (Cornell, Ithaca College, Cayuga Health, etc.) is NOT included — the repo ships with an empty `scrape_sources` table; other counties add their own.
- The scraper/categorization/wage **code** stays (it's the feature); it requires a Firecrawl key + an AI provider key.
- No live-data export (no Tompkins rows, emails, or opportunity records leave the project).
