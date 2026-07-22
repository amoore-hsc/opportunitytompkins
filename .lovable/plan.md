## Goal

Change the automated 60-day listing reminder so it fires based on `updated_at` (not `created_at`), but still only sends **once per listing**. The 90-day admin "Needs Attention" panel handles anything that goes unaddressed after that.

## Behavior change

**Eligibility (new rule)** for the weekly Monday cron in `send-listing-reminder`:
- Listing is `active = true`
- `updated_at` is 60+ days ago
- `reminder_sent_at` is null

This is a one-line change in intent from the current rule ("created 60+ days ago AND updated_at ≈ created_at AND reminder_sent_at is null"). The new rule catches listings like the Food Pantry Helper — created April 16, edited once on May 4, never reminded — which the old rule excluded because it required the listing to have never been touched.

No repeat sends. Once `reminder_sent_at` is stamped, the listing is done with automated reminders and moves into the 90-day admin panel's territory for manual follow-up.

**Grouping**: unchanged — still batched per `admin_email || org_email` into one consolidated email.

**Reset on user action**: unchanged. Any edit bumps `updated_at`; the confirm-listing flow already clears `reminder_sent_at` and updates `updated_at`.

**Email copy**: subject and body change from "Active for 60+ Days" / "active for 60+ days without updates" to "not updated in 60+ days" so the wording matches the new criterion.

## Files touched

- `supabase/functions/send-listing-reminder/index.ts`
  - Change the query from `.lte("created_at", sixtyDaysAgo)` to `.lte("updated_at", sixtyDaysAgo)`, keep `.eq("active", true)` and `.is("reminder_sent_at", null)`.
  - Remove the post-fetch `Math.abs(createdAt - updatedAt) < 1000` filter (no longer needed).
  - Update subject line and body wording as above.
  - Grouping loop and `reminder_sent_at = now()` write stay as-is.

No database migration, no schema changes, no cron changes, no admin UI changes.

## Follow-up verification

After deploy, query the DB to confirm the Food Pantry Helper is now in the eligible set and would fire on the next Monday cron.
