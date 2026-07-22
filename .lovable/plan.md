Move the admin panel to a tabbed layout with a new Dashboard tab and a Listings tab.

## What we will build

Two tabs in `src/pages/Admin.tsx`:
1. **Dashboard** — new all-time aggregated metrics from the weekly report, plus removal-reason breakdowns.
2. **Listings** — the existing admin table, filters, edit/delete actions, and stale-listings alert.

Default tab: **Dashboard**.

## Dashboard tab

Summary cards:
- Total Applications (sum of all `application_counts.count`)
- Positions Filled (sum of `positions_filled` across deactivated listings)
- Listings Removed (count of listings with `deactivated_at` set)
- Active Listings (count of `active = true` listings)
- Education Listings (count of `type = 'education'`)
- Volunteer Listings (count of `type = 'volunteer'`)

Breakdown tables:
- Applications by Organization
- Applications by Role Classification
- Applications by Opportunity
- Positions Filled by Organization
- Removal Reasons (count of each `removal_reason`)

## Listings tab

Existing admin panel content:
- Stale-listings alert
- Type and Status filters
- Results counter and clear filters
- Opportunities table
- Edit dialog
- User-submitted jobs section

## Implementation steps

1. Fetch `opportunities` and `application_counts` in parallel after admin role is confirmed.
2. Add `activeTab` state (`"dashboard" | "listings"`) and a tab bar using the existing segmented-toggle button style.
3. Create `src/components/admin/AdminDashboard.tsx` to render the summary cards and breakdown tables from precomputed aggregates.
4. Keep all existing listings UI inside the Listings tab.
5. No backend changes needed; all aggregation is client-side from existing tables.