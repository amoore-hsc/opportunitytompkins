

# Plan: Simplified Address Validation (No State/ZIP Required)

## Overview
Simplify the address validation to only require a street address and city name. Since all listings are in the same state (New York), we can remove the state requirement and the ZIP code was already optional.

## How It Will Work

The simplified validation will accept:
- `388 Upper Oakwood Ave Elmira` (street + city)
- `123 Main St, Ithaca` (with comma)
- `388 Upper Oakwood Ave Elmira NY 14903` (full address still works)

Pattern detection uses:
- **Street indicators**: St, Ave, Rd, Dr, Blvd, etc. to identify where street ends
- **City name**: At least one word after the street indicator

## Changes

### File: `src/pages/ListOpportunity.tsx`

**1. Simplified helper function (lines 19-47)**

```typescript
const isValidAddressPattern = (address: string): boolean => {
  // If has commas, check for at least 2 parts (street, city)
  const parts = address.split(',').map(p => p.trim()).filter(p => p.length > 0);
  if (parts.length >= 2) {
    return true;
  }
  
  // For addresses without commas, detect street indicator followed by city name
  // Optionally may include state and/or ZIP at the end
  const streetIndicators = /\b(st|ave|rd|dr|ln|blvd|street|avenue|road|drive|lane|boulevard|way|court|ct|place|pl|pkwy|parkway|cir|circle|ter|terrace|hwy|highway)\.?\s+/i;
  
  // Check if there's content after a street indicator (the city name)
  if (streetIndicators.test(address)) {
    const afterStreet = address.split(streetIndicators).pop()?.trim();
    // Must have at least one word for city name (ignore optional state/zip at end)
    return !!afterStreet && afterStreet.length > 0;
  }
  
  return false;
};
```

**2. Update error message (lines 49-53)**

```typescript
const addressSchema = z.string().min(1, "Address is required").refine(val => {
  return isValidAddressPattern(val);
}, {
  message: "Please enter a complete address with street and city (e.g., 123 Main St, Ithaca or 123 Main St Ithaca)"
});
```

**3. Update placeholder text (around line 427)**

```typescript
placeholder="e.g., 123 Main St, Ithaca or 123 Main St Ithaca"
```

## Examples of What Will Now Work

| Input | Result |
|-------|--------|
| `388 Upper Oakwood Ave Elmira` | Valid |
| `123 Main St Ithaca` | Valid |
| `123 Main St, Ithaca` | Valid |
| `388 Upper Oakwood Ave Elmira NY 14903` | Valid (state/zip still accepted) |
| `Just some text` | Invalid (no street indicator) |
| `123 Main St` | Invalid (no city after street) |

## Files Modified
- `src/pages/ListOpportunity.tsx`

