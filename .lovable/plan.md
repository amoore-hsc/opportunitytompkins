

## Admin Panel: Type-Specific Edit Fields

### Problem
The admin edit dialog currently shows all fields (volunteer-specific ones like Role Classification, Location, Bus Route, etc.) regardless of opportunity type. Education & Training listings have different fields that are not currently editable in the admin panel.

### Changes

#### 1. Update the Opportunity interface (line ~116)
Add missing education fields: `program_name`, `website`, `program_components`.

#### 2. Update the admin table columns (lines ~971-981)
Replace the static "Position Title" column with a conditional display:
- Volunteer: show Position Title
- Education: show Program Name

#### 3. Update the edit dialog (lines ~1028-1338)
Make fields conditional based on `editingOpportunity.type`:

**Volunteer-only fields:**
- Role Classification
- Position Title
- Service Location / Address / Bus Route
- Contact Name
- Organization Phone
- Admin Contact section

**Education-only fields (new):**
- Program Name
- Website (required)
- Program Components (multi-select checkboxes, matching the listing form)

**Shared fields (both types):**
- Type
- Organization Name
- Description
- Hours Available
- Days & Times Available
- Additional Requirements
- Organization Email
- Active status

#### 4. Update handleUpdate (lines ~637-677)
Include `program_name`, `website`, and `program_components` in the update payload, and conditionally clear type-specific fields when saving (e.g., clear `role_classification` for education listings).

#### 5. Update table row display (lines ~984-989)
Show "Program Name" instead of "Position Title" for education rows, or show whichever is relevant.

### Technical Details

- The `PROGRAM_COMPONENTS` array will be added to Admin.tsx (same values as in ListOpportunity.tsx)
- Program components are stored as a comma-separated string and will be split/joined for the checkbox UI
- Field ordering in the edit dialog will mirror the listing form: for volunteer, Org Name appears above Position Title; for education, Org Name appears above Program Name

