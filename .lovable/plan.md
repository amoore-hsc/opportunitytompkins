## Plan: Make the "All Categories" view obviously unfiltered

### What's actually happening

This isn't a bug in the filter logic — I traced through it carefully:

- `categoryFilter` defaults to `"all"` and the filter at line 89 correctly skips filtering when the value is `"all"`
- When you pick "All Categories" again, the same skip happens
- All 751 active jobs are passed to the renderer, which groups them into 9 category sections sorted alphabetically: **Administrative (129), Education (271), Government (31), Healthcare (28), Hospitality (77), Other (91), Social Services (25), Technology (57), Trades/Labor (42)**

What you're actually seeing: **"Administrative" is the first section because A comes first alphabetically**, and on the current viewport its header badge + 129 jobs fill the whole screen. It feels like the filter is stuck on Administrative, but if you scroll down past the Administrative list, all 8 other sections are there.

So the problem is **UX, not logic** — there's no visual cue that you're looking at a multi-section grouped view rather than a filtered one.

### Fix

Three small changes to `src/pages/Employment.tsx`:

1. **Add a results summary line** above the list, e.g. `Showing 751 jobs across 9 categories` (or `Showing 129 Administrative jobs` when filtered). Makes it instantly obvious whether a filter is active.
2. **Add a "jump to category" chip row** at the top of the unfiltered view — small clickable badges (`Administrative · Education · Government · …`) that scroll to that section. Lets people see at a glance that other categories exist and skip the long Administrative list.

### Files

- `src/pages/Employment.tsx` only

### What we're NOT changing

- No backend changes
- No filter logic changes (it's already correct)
- The category dropdown stays as-is