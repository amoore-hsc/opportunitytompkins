
# Add "Copy Edit Link" Button to Admin Panel

Add a button next to the existing Resend Email (Mail) button in the admin table that copies the magic edit link to the clipboard, allowing admins to share it through alternative channels (e.g., phone, text, different email).

## Changes

**File: `src/pages/Admin.tsx`**

1. Import the `Link2` (or `Copy`) icon from `lucide-react` alongside existing icons.

2. Add a new button between the Mail and Trash buttons in the actions column (around line 1470):
   - Ghost variant, small size, with a link/copy icon
   - On click, constructs the edit URL (`${window.location.origin}/edit-opportunity/${opp.edit_token}`) and copies it to the clipboard using `navigator.clipboard.writeText()`
   - Shows a success toast confirming the link was copied

No database or backend changes needed -- the `edit_token` is already fetched in the admin query.
