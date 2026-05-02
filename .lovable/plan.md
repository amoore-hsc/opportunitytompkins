## Add a Unified Pay Filter (Hourly + Salary in One Control)

### The challenge
Wages in the database are messy free text. Examples from the live data:
- Hourly: `$17.45/hr`, `$23.18 per hour`, `$20.00/Hour`
- Hourly range: `$17 - $19 an hour`, `$25.09 - $27.73`
- Annual salary: `$98,548.00 - $114,529.00`, `$30,630/year`, `$76,500 - $90,000/year`
- Weekly: `From $1,199.10 a week`
- Junk/missing: `/`, `Null`, `Not specified`, `20 hours a week`

A single filter only works if we convert everything to a common unit. The standard approach is **hourly-equivalent**: normalize annual salaries (÷ 2080 hrs/yr) and weekly pay (÷ 40 hrs/wk) to an hourly rate, then filter on that single number.

### What we'll build

A **"Minimum Pay"** dropdown filter on the Employment page with preset tiers:

- All pay levels (default)
- $15+/hr (~$31k+/yr)
- $18+/hr (~$37k+/yr)
- $20+/hr (~$42k+/yr)
- $25+/hr (~$52k+/yr)
- $30+/hr (~$62k+/yr)
- Has any pay listed
- Pay not listed

The dropdown shows both hourly and annual equivalents on each option so it's clear to users that both job types are included. Selecting "$20+/hr" matches:
- An hourly job paying `$22/hr` ✓
- A salaried job paying `$50,000/year` (≈ $24/hr) ✓
- A range like `$18 - $22 an hour` (top of range qualifies) ✓

### How the parsing works

A small client-side helper extracts a numeric hourly-equivalent from each wage string:

1. Strip commas, lowercase the text.
2. Pull all dollar numbers (e.g. `[17.45]`, `[98548, 114529]`).
3. Detect the period:
   - Contains "hour", "/hr", "hr", "hourly" → hourly
   - Contains "year", "/yr", "annual", "salary" with no hourly keyword, OR any number ≥ 10,000 → annual (÷ 2080)
   - Contains "week" → weekly (÷ 40)
   - Otherwise: if number < 200 assume hourly, if ≥ 10,000 assume annual
4. For ranges, use the **maximum** of the parsed numbers (so a $50–60k job qualifies for "$25+/hr" because the top of its range exceeds the threshold). This is the user-friendly choice — filters surface jobs that *could* meet the bar.
5. Junk strings like `/`, `Null`, `Not specified`, `20 hours a week` (no `$`) → no hourly value → only matches "All" or "Pay not listed".

The filter then keeps jobs whose hourly-equivalent ≥ the selected threshold.

### Where it goes
Added as a new `<Select>` in the existing filter row on `src/pages/Employment.tsx`, between the Employer and Employment Type dropdowns. Resets pagination to page 1 like the other filters.

### Files to change
- `src/pages/Employment.tsx` — add `parseWageToHourly()` helper, `payFilter` state, the Select control, and a filter step in the existing filter pipeline.

### Out of scope
- No DB migration. Parsing is purely client-side; the raw `wage` string is preserved for display.
- No backfill or re-extraction of existing wages.
- No free-text "min $/hr" input — presets keep it simple and avoid confusing edge cases.

### Trade-off to flag
Annual-vs-hourly normalization assumes 40 hrs/week × 52 weeks (2080 hrs). Part-time salaried roles will look higher per hour than they really are, but this matches how every major job board (Indeed, LinkedIn) does the conversion.
