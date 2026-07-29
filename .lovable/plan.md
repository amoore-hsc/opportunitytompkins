Add dashboard export options for PDF and Excel.

## What we will build

- Place an **Export** dropdown next to the Dashboard/Listings tabs in the admin panel.
- Offer two options: **Download as PDF** and **Download as Excel (.xlsx)**.
- Both exports use the existing `dashboardMetrics` object already computed in `src/pages/Admin.tsx`, so the numbers stay in sync with the on-screen dashboard.

## PDF export

- Add a `html2pdf.js` dependency (browser-based, converts a DOM element to a styled PDF).
- Wrap the dashboard content in a printable container with a light background and explicit branding colors so it renders cleanly when exported.
- Download filename: `tompkins-opportunity-dashboard-YYYY-MM-DD.pdf`.

## Excel export

- Add a `xlsx` dependency (SheetJS) to generate a workbook client-side.
- Create a workbook with multiple sheets:
  - **Summary** — the six summary cards (total applications, positions filled, listings removed, active listings, education listings, volunteer listings).
  - **Applications by Org** — organization name + count.
  - **Applications by Role** — role classification + count.
  - **Applications by Opportunity** — opportunity title, organization, count.
  - **Positions Filled by Org** — organization, listings closed, positions filled.
  - **Removal Reasons** — reason + count.
- Download filename: `tompkins-opportunity-dashboard-YYYY-MM-DD.xlsx`.

## Files to change

- `src/pages/Admin.tsx`: add the Export dropdown menu next to the Dashboard/Listings toggle.
- `src/components/admin/AdminDashboard.tsx`: wrap the dashboard in a `ref`-backed container for PDF export.
- `src/components/admin/DashboardExport.tsx` (new): export button/dropdown + helper functions for PDF and Excel generation.
- `package.json` / lockfile: add `html2pdf.js` and `xlsx`.

## Open decision

- Default filename prefix is `tompkins-opportunity-dashboard`. Let me know if you prefer a different file name.