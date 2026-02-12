
# Plan: Dual Contact Support (Public + Admin)

## Overview
Organizations can now have two contacts: a **public contact** (shown to applicants) and an **admin contact** (receives confirmation emails, edit links, and application notifications). A "Same as public contact" checkbox (checked by default) lets orgs use one person for both.

## Implementation (Completed)

### Database
- Added `admin_contact_name` (text, nullable) and `admin_email` (text, nullable) to `opportunities` table
- No `admin_phone` column (removed per user request)

### ListOpportunity.tsx
- Added `sameContact` state (default `true`) and `adminContactName`/`adminEmail` form fields
- Split contact section into "Public Contact" and "Admin Contact" sub-sections
- When `sameContact` is true, admin fields are hidden and null is stored in DB
- Confirmation email is sent to admin email when provided, otherwise to public email

### EditOpportunity.tsx
- Same dual contact UI with "Same as public contact" checkbox
- Loads existing admin contact fields; auto-detects if admin contact was set
- Saves admin fields via update-opportunity-by-token edge function

### Edge Functions Updated
- `send-confirmation-email`: receives and uses admin email/name when provided
- `send-application-email`: accepts optional `adminEmail`, sends notification to admin when available
- `send-listing-reminder`: groups by admin_email when available instead of org_email
- `send-interest-notification`: sends to admin_email when available
- `update-opportunity-by-token`: accepts `admin_contact_name` and `admin_email` in updates

### Opportunity Interface
- Added `admin_email: string | null` to the Opportunity TypeScript interface
- ApplicationDialog passes `adminEmail` to the send-application-email function

### No Changes Needed
- OpportunityCard / public display: still shows `org_email`/`org_phone`/`contact_name` (public contact)
- `get-opportunity-by-token`: already uses `select("*")` so admin fields are included automatically
