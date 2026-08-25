# Replace Handshake icon with Tompkins County favicon

## Goal
Replace every `Handshake` (lucide-react) icon instance with the Tompkins County favicon image, across all page headers and decorative uses.

## Asset
Use the existing `public/favicon.png` (4959-byte navy Tompkins County silhouette), referenced as `/favicon.png`. No new asset generation needed.

## Changes per file
Replace `<Handshake className="..." />` with `<img src="/favicon.png" alt="" aria-hidden="true" className="..." />`, keeping each instance's existing size classes. Where `text-primary` / `text-destructive` color classes appear, drop them (raster ignores text color; the favicon is already navy). For the `ShareOpportunitiesDialog` `mr-2 h-4 w-4` instance, keep layout classes (`mr-2 h-4 w-4 w-4`).

Files & instances:
- `src/pages/Index.tsx` — header logo (h-8 w-8)
- `src/pages/Opportunities.tsx` — header logo (h-8 w-8)
- `src/pages/ListOpportunity.tsx` — header logo (h-8 w-8)
- `src/pages/EditOpportunity.tsx` — two header logos (h-8 w-8)
- `src/pages/Employment.tsx` — header logo (h-8 w-8)
- `src/pages/EmploymentResources.tsx` — header logo (h-8 w-8)
- `src/pages/Admin.tsx` — header logo (h-8 w-8) + four empty-state icons (h-12 w-12)
- `src/components/ShareOpportunitiesDialog.tsx` — inline icon (mr-2 h-4 w-4)

## Cleanup
Remove `Handshake` from each file's lucide-react import list once no longer used. Leave other lucide imports intact.

## Verification
- Read each edited file to confirm no remaining `Handshake` references and imports are clean.
- Check `build-errors.log` after the build for type/unused-import errors.
