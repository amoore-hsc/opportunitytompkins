## What's wrong

The volunteer opportunities page is broken for everyone. Two problems, both introduced by the recent security hardening:

1. **No Data API grants anywhere.** I checked every table and view in the database: `opportunities`, `public_opportunities`, `employment_opportunities`, `application_counts`, `scrape_sources`, `user_roles` all have zero grants for the app's `anon`, `authenticated`, and `service_role` roles. Any read from the site returns a "permission denied" error — which matches the user's report. This affects the job board and admin panel too, not just volunteer opportunities.

2. **The public view can't see its own rows.** `public_opportunities` is defined with `security_invoker=true`, meaning it runs under the visitor's permissions against the `opportunities` table. The only SELECT policy on `opportunities` is admin-only, so even after grants are restored, a public visitor would get an empty list.

## Fix

**Step 1 — Make the public view able to read active listings**

Switch `public_opportunities` to run with the view owner's rights instead of the visitor's. The view already excludes every sensitive column (no `edit_token`, no `org_email`, no admin contact) and filters to `active = true`, so this exposes exactly the fields the page is meant to show, and nothing more. The base `opportunities` table stays locked down — direct reads remain admin-only.

**Step 2 — Restore the Data API grants**

Per object, matching the existing row-level policies:

| Object | anon | authenticated | service_role |
|---|---|---|---|
| `public_opportunities` (view) | SELECT | SELECT | ALL |
| `opportunities` | INSERT only (public submission form) | SELECT/INSERT/UPDATE/DELETE | ALL |
| `employment_opportunities` | SELECT (has a public "active = true" policy) | SELECT/INSERT/UPDATE/DELETE | ALL |
| `application_counts` | none | SELECT/INSERT/UPDATE/DELETE | ALL |
| `scrape_sources` | none | SELECT/INSERT/UPDATE/DELETE | ALL |
| `user_roles` | none | SELECT | ALL |

Row-level security stays exactly as it is — grants only make the tables reachable through the API; the policies still decide which rows each person sees.

**Step 3 — Verify**

Load the volunteer opportunities page and the employment page as a signed-out visitor and confirm listings render with no console errors, then check the admin panel still loads for an admin account.

## Technical notes

- Single migration: `ALTER VIEW public.public_opportunities SET (security_invoker = false);` followed by the GRANT block above.
- No frontend changes needed — `src/pages/Opportunities.tsx` already queries `public_opportunities`.
- Edge functions use the service role and were unaffected (service role bypasses both grants checks via `ALL` and RLS), which is why emails and scraping kept working while the public pages failed.
