

## Problem

When "Flexible Hours" is enabled, each day still renders inside a large bordered card (`rounded-lg border border-border p-4`) with only a single checkbox and label inside. This creates 7 oversized, mostly-empty cards stacked vertically, which looks visually sparse and wastes space.

## Solution

When "Flexible Hours" is toggled on, switch the day selection to a compact layout:
- Use a horizontal flex-wrap grid of smaller checkboxes instead of full-width bordered cards
- Each day becomes a small inline chip/checkbox item rather than a full card
- When "Flexible Hours" is off, keep the current card layout with time sliders

## Technical Details

**File: `src/pages/ListOpportunity.tsx`** (lines ~528-586)
- Wrap the day rendering in a conditional:
  - If `flexibleTime` is true: render days in a `flex flex-wrap gap-2` container with compact styling (small padding, inline layout)
  - If `flexibleTime` is false: keep the existing card layout with sliders

**File: `src/pages/EditOpportunity.tsx`** and **`src/pages/Admin.tsx`**
- Apply the same compact layout pattern for consistency across all three pages
