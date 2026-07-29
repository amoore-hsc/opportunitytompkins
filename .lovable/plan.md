## What's broken

The Monday 9:30am reminder job selects active volunteer listings where the last-reminder field is empty **and** the listing hasn't been updated in 60+ days. Once a listing gets its one reminder, that field is set forever — editing the listing restarts the 60-day staleness clock but never clears it. Result: a listing can go permanently silent.

Confirmed against live data: Habitat for Humanity's "Construction Volunteer" was reminded Apr 27 at 14:30, the org edited the listing at 18:14 that same day, and it is now 93 days stale with no further reminder possible.

## New rule

A listing is eligible when it is active, volunteer type, not updated in 60+ days, **and** has had no reminder since its most recent update. In other words, every edit re-arms the reminder. Still one reminder per stale cycle — no repeat nagging while the listing sits untouched.

## Changes

1. **Reminder job** (`send-listing-reminder`)
   - Replace the "no reminder ever sent" condition with "no reminder sent since the last update": eligible when the last-reminder field is empty **or** is older than the listing's last-updated timestamp.
   - Because this comparison is between two columns, do the 60-day filter in the query and apply the reminder-vs-update comparison in code on the returned rows.
   - Grouping by contact email, email content, and the existing education-type exclusion all stay as-is.
   - Redeploy the function.

2. **Re-arm the three stuck listings** (one-time data fix, so they go out in Monday's batch):
   - Habitat for Humanity — Construction Volunteer (93 days stale)
   - Friends of Stewart Park — Garden and Park Cleanup (153 days stale)
   - Amplify Equity — Virtual Office Support (103 days stale)

   Clearing their last-reminder field makes them eligible under the new rule. No other listing is touched; the nine reminded on Jul 27 stay quiet until they are edited and go stale again.

3. **Admin panel** — no change. The 90-day delinquent banner keeps using last-updated, which is unaffected.

## Technical notes

- Sequence: run the data migration first, then edit and redeploy the edge function.
- The comparison must use the listing's stored last-updated timestamp; the existing database trigger already preserves that timestamp when only reminder bookkeeping fields change, so setting the reminder timestamp will not itself re-arm the listing in a loop.
- The manual "resend reminder" button in the admin panel writes to separate counter fields and is unaffected by this change.
