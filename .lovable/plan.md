
# Disable Education & Training Listing with "Coming Soon" Label

## What will change

The "Education & Training" option in the opportunity type dropdown on the listing form will be disabled and show a "(Coming Soon)" label, preventing users from selecting it while signaling it will be available in the future.

## Changes

**File: `src/pages/ListOpportunity.tsx`**

1. Update the Education & Training `SelectItem` to be disabled and append "(Coming Soon)" to its label:
   - Change `<SelectItem value="education">Education & Training</SelectItem>` to `<SelectItem value="education" disabled>Education & Training (Coming Soon)</SelectItem>`

This is a single-line change that:
- Prevents selection of the education type
- Clearly communicates the feature is coming soon
- Keeps the volunteer listing flow completely unaffected
- No other files need changes since the education form fields are already conditionally rendered behind `isEducation` checks
