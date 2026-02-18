

# Enable Education & Training on List Opportunity Page

## Overview
Remove the `disabled` attribute and "(Coming Soon)" label from the Education & Training option in the opportunity type selector.

## Change

**File: `src/pages/ListOpportunity.tsx` (line 346)**

Update:
```
<SelectItem value="education" disabled>Education & Training (Coming Soon)</SelectItem>
```
To:
```
<SelectItem value="education">Education & Training</SelectItem>
```

Single line change -- the rest of the Education & Training form logic (conditional fields, submission handling, success message) is already fully implemented.

