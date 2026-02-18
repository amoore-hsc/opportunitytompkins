

## Create Test Education & Training Opportunity

Insert a test record into the `opportunities` table with the following details:

- **Type**: Education & Training
- **Organization Name**: Test Education Organization
- **Program Name**: Career Development Program
- **Description**: A test education and training program for admin panel verification.
- **Website**: https://example.com
- **Program Components**: GED, ESL
- **Hours Available**: 20 hours/week
- **Days/Times Available**: Monday-Friday, 9am-5pm
- **Location**: Ithaca, NY
- **Contact Email**: test@example.com
- **Contact Phone**: (607) 555-0100
- **Active**: true

### Technical Details

A single SQL INSERT into the `opportunities` table using all required fields and education-specific fields (`program_name`, `website`, `program_components`). No schema changes needed -- the table already supports this type.

