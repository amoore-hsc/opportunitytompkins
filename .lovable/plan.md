
# Plan: Add Helper Text for NYDocSubmit PDF Link

## Overview
Add helper text below the "Submit Documentation to DSS via NYDocSubmit" button explaining that users may need to right-click and select "Open link in new tab" if their browser blocks the PDF.

## Changes

### File: `src/components/ElectronicVerificationForms.tsx`

**Update the Submit button section (lines 78-92)**

Add a small helper text paragraph below the button explaining the workaround for Chrome blocking:

```tsx
{/* Row 4 - Submit */}
<div className="flex flex-col items-center mt-6 gap-2">
  <a 
    href="https://otda.ny.gov/policy/directives/2019/ADM/19-ADM-07-Attachment-1.pdf" 
    target="_blank" 
    rel="noopener noreferrer" 
    className="w-full"
  >
    <Button variant="success" className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
      <Send className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
      Submit Documentation to DSS via NYDocSubmit
      <VisuallyHidden>(opens in new tab)</VisuallyHidden>
    </Button>
  </a>
  <p className="text-sm text-muted-foreground text-center">
    If the link doesn't open, right-click the button and select "Open link in new tab"
  </p>
</div>
```

## What Changes
- Wrapper div changes from `flex justify-center` to `flex flex-col items-center gap-2` to stack button and helper text
- A new `<p>` element with muted styling provides instructions for users whose browsers block the PDF

## Files Modified
- `src/components/ElectronicVerificationForms.tsx`
