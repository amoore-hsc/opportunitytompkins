Add sort controls to the User-Submitted Jobs table and a status filter for quick triage.

### Plan
1. **Sortable "Last Checked" column**
   - Add a `lastCheckedSort` state (`"desc" | "asc"`) to `UserSubmittedJobsSection`.
   - Make the "Last Checked" table header clickable, showing the same `ArrowUp` / `ArrowDown` icons already used in the Admin listing table.
   - Sort the displayed rows by `updated_at` based on the selected direction.

2. **Status filter**
   - Add a `statusFilter` state (`"all" | "active" | "removed"`) to the section.
   - Render a small inline segmented control (All / Active / Removed) above the table, matching the existing filter style in the Admin page.
   - Filter the rows by `job.active` before sorting.

3. **Verify the table layout**
   - Ensure the header still shows the other columns (Job Title, Employer, Category, Submitted, Last Checked, Status, Actions).
   - Confirm the empty-state message still spans the correct column count.

No backend or database changes are required.