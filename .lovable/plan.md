

# Add Education & Training Opportunity Listings

## Overview
Add a new "Education & Training" opportunity type to the existing listing system. These listings use different fields than volunteer opportunities and have no apply workflow. They will appear on the same Opportunities page, filterable by type.

## What Changes

### 1. Database: Add new columns to `opportunities` table
Add columns to support education-specific fields while reusing the existing table:
- `program_name` (text, nullable) -- used instead of `position_title` for education listings
- `website` (text, nullable) -- program website URL
- `program_components` (text, nullable) -- dropdown selection (GED, ESL, etc.)

The existing columns that will be reused for education listings:
- `org_name` -- Organization Name
- `description` -- Program Description (25 words max, already enforced)
- `hours_available` -- Hours available per week
- `additional_requirements` -- Minimum Requirements (optional)
- `days_times_available` -- Schedule (optional for education)

### 2. Listing Form (`ListOpportunity.tsx`)
- Enable the "Education & Training" option in the type dropdown (remove "Coming Soon" / disabled state)
- Conditionally show different fields based on selected type:

**When "Education & Training" is selected, show:**
- Organization Name (required)
- Program Name (required) -- new field
- Program Description (25 words max, required)
- Website (optional) -- new field
- Program Components dropdown (required) with options: GED, ESL, Work-Based Learning, Job Search, Adult Basic Education, Vocational or Technical Training, Job Readiness Training, Other -- styled like the Role Classification dropdown with descriptions
- Hours Available per Week (required)
- Minimum Requirements (optional) -- reuses the existing requirements UI
- Schedule (optional) -- reuses existing days/times UI but not required
- No location/bus route fields
- No admin contact section (no emails exchanged)
- No acknowledgement checkbox

**When "Volunteer" is selected:** everything stays the same as today

- Skip sending confirmation email for education listings
- Skip the confirmation email notice text for education listings

### 3. Opportunity Card (`OpportunityCard.tsx`)
- For education listings, show "Program Components" badge instead of "Role Classification" badge
- Show `program_name` instead of `position_title`
- Show website as a clickable link if provided
- Hide the "Apply" button for education listings (no apply workflow)
- Hide location/bus route if not set

### 4. Filters (`OpportunityFilters.tsx`)
- Add a "Program Components" filter dropdown (similar to Role Classification) that appears when filtering education listings or when "All Types" is selected
- Existing Role Classification filter should only apply to volunteer listings

### 5. Opportunities Page (`Opportunities.tsx`)
- Update the data query to include the new columns (`program_name`, `website`, `program_components`)
- Update the `Opportunity` interface to include new fields

### 6. No Email Changes
Since there is no apply workflow for education listings, no email edge functions need modification. The confirmation email will simply not be sent for education listings.

## Technical Details

### Database Migration
```sql
ALTER TABLE public.opportunities
  ADD COLUMN program_name text,
  ADD COLUMN website text,
  ADD COLUMN program_components text;
```

### Conditional Form Logic
The listing form will use `formData.type` to toggle between two sets of fields. Shared utility code (word counter, day schedule, requirements) stays the same. Fields unique to volunteer (role classification, position title, location, bus route, contact info, acknowledgement) are hidden for education. Fields unique to education (program name, website, program components) are hidden for volunteer.

### Submission Logic
For education listings:
- `days_times_available` defaults to "N/A" if no days selected (since schedule is optional)
- `location` defaults to "N/A" (not applicable for education)
- `org_email`, `org_phone`, `contact_name` will still be collected or set to placeholder values since they are NOT NULL in the database -- we will need to decide: either make them nullable or collect a minimal contact. Since these are NOT NULL columns, the simplest approach is to still collect Organization Name and a contact email (for the edit link), but skip the public/admin contact split and the phone field.

**Revised approach for contact info on education listings:** Collect only `org_name` (already planned) and `org_email` (required, for receiving the edit link). Set `org_phone` to "N/A", `contact_name` to null-safe default. This avoids a schema migration on NOT NULL constraints.

### Card Display
Education cards will show:
- Badge: "Education & Training" (secondary variant, already handled)
- Program Components badge (replacing Role Classification badge)
- Org Name as title
- Program Name as subtitle
- Description
- Hours available
- Website link (if provided)
- Schedule (if provided)
- Minimum Requirements (if provided)
- No Apply button

### Files to Create/Modify
- **Migration**: New migration for 3 columns
- **`src/pages/ListOpportunity.tsx`**: Conditional form fields based on type
- **`src/pages/Opportunities.tsx`**: Update interface and query
- **`src/components/OpportunityCard.tsx`**: Conditional display for education vs volunteer
- **`src/components/OpportunityFilters.tsx`**: Add Program Components filter
- **`src/pages/EditOpportunity.tsx`**: Support editing education listings
- **`src/components/PrintableOpportunities.tsx`**: Include education fields in print view
- **`src/components/ShareOpportunitiesDialog.tsx`**: Include education fields if relevant
