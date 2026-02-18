

# Update Education Confirmation Email Only (No Changes to Volunteer Email)

## Overview
Modify the education-specific path in the confirmation email to use green styling for the "Update or Remove" section, add a "Need Help?" content card, and update the footer to show "Thank You for Supporting Our Community" -- all scoped to the education email only using the existing `isEducation` conditional logic. The volunteer email remains completely untouched.

## Changes (single file: `supabase/functions/send-confirmation-email/index.ts`)

### 1. Green "Update or Remove" section -- education only
Currently both email types share the same orange "Update or Remove" card (lines 138-146). Split this into a conditional:
- **Volunteer**: keeps the current orange styling (`#e67e22` / `#fff0e6`) -- no change
- **Education**: uses green styling (`#2e7d32` border/heading/button, `#e6f7e6` background)

### 2. Add "Need Help?" content card -- education only
Insert a "Need Help?" section inside the main content area for education emails only (before line 149), with the contact email `rhinton@uwtc.org`. The volunteer email already has this in its footer, so no change there.

### 3. Footer banner -- education only
Make the footer conditional:
- **Volunteer**: keeps the current footer with "Need Help?" and contact info (lines 153-158) -- no change
- **Education**: footer shows the "Thank You for Supporting Our Community" banner with star emojis, matching the header style

## Technical Approach
All three changes use the existing `isEducation` flag to conditionally render different HTML. The "Update or Remove" card and footer sections will be turned into conditional variables (like `introText`, `updateRemoveText`, and `whatHappensNextHtml` already are), ensuring the volunteer email path is completely unchanged.

