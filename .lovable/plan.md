# Standardize header title on Employment pages

## Problem
The Employment Opportunities and Employment Resources pages use page-specific
titles in the top header (`<h1>`), while the other content pages (Opportunities,
List Opportunity, Edit Opportunity) use the brand name "Tompkins Opportunity".
The page-specific name already appears in the main `<h2>` below the header, so
the header title is redundant on these two pages and inconsistent with the rest
of the site.

## Change
Update the header `<h1>` text on two pages:

- `src/pages/Employment.tsx` (line 245): `"Employment Opportunities"` → `"Tompkins Opportunity"`
- `src/pages/EmploymentResources.tsx` (line 195): `"Employment Resources"` → `"Tompkins Opportunity"`

No other changes. The main `<h2>` titles ("Find Employment" and
"Employment Resources") stay as-is so each page is still clearly identified.
