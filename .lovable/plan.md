

# Add Half-Hour Increments to Hours Slider on List Opportunity Page

## Overview
Update the hours slider on the "List an Opportunity" page to support half-hour increments (0.5 steps) for more precise hour entry, without changing the public-facing Opportunities filter page.

## Changes

**File: `src/pages/ListOpportunity.tsx`**

1. Change the hours `Slider` `step` prop from `1` to `0.5`
2. Update the label to display half-hour values cleanly (e.g., "20.5")
3. Update the `aria-valuetext` to reflect the new precision

No changes to `src/components/OpportunityFilters.tsx` or any other file.

