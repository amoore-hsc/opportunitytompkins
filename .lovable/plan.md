
# Plan: Location Type Selector for Listing Page

## Overview
Replace the plain address text input with a dropdown that lets users choose between three location types:
1. **Specific Address** – shows the existing address input with validation and bus route checkbox
2. **Tompkins County (General)** – stores "Tompkins County" automatically, no address input needed
3. **Remote** – stores "Remote" automatically, no address input needed

## Implementation (Completed)

### File: `src/pages/ListOpportunity.tsx`

- Added `locationType` state (`""`, `"specific"`, `"general"`, `"remote"`)
- Replaced the location `<Input>` with a `<Select>` dropdown for location type
- Conditionally render address input + bus route checkbox only when `locationType === "specific"`
- When "general" is selected, `formData.location` is set to `"Tompkins County"` and `onBusRoute` to `false`
- When "remote" is selected, `formData.location` is set to `"Remote"` and `onBusRoute` to `false`
- Address validation in `handleSubmit` only runs when `locationType === "specific"`

## No database changes needed
The location field stores a regular string regardless of type.
