Add filtering controls to the Admin Panel so you can isolate volunteer vs education listings and toggle between active vs inactive statuses.

## Changes

### Frontend: `src/pages/Admin.tsx`

1. Add local filter state:
   - `typeFilter`: `"all" | "volunteer" | "education"`
   - `statusFilter`: `"all" | "active" | "inactive"`

2. Derive the displayed list with `useMemo`:
   - Apply `typeFilter` before `statusFilter` (or both together).
   - Then apply the existing `updatedAtSort`.

3. Add UI controls above the listings table:
   - Two segmented toggle groups (or Select dropdowns) for Type and Status.
   - A "Clear filters" link/button that resets both to `"all"`.

4. Keep the existing `StaleListingsAlert` unchanged — it already filters to active volunteer listings internally.

5. Show a small results count next to the filters (e.g., "Showing 24 of 48 listings").

## UI/UX notes
- Default state: all types, all statuses (same as today).
- Filter controls should be responsive and stack on mobile.
- Use existing design tokens (Button, Select, or toggle components) and avoid hardcoded colors.

## No backend changes needed
The page already fetches all opportunity fields via `select("*")`; filtering will be client-side only.