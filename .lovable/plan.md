# Limit job listings to Tompkins County (plus remote)

## Goal
Job listings whose location is clearly outside Tompkins County should not appear on the Find Employment page. Remote roles stay, no matter where the employer is.

## What the data shows today
Active listings include locations that are clearly outside the county:
- Montour Falls, NY (62) and Cortland, NY (8) from Cayuga Health
- New York City / Cornell Tech (2), New York City (Other) (1), Geneva (1) from Cornell University

In-county examples that must be kept: Ithaca (all spellings), Dryden, Trumansburg, "Ithaca (Main Campus)", "Ithaca, Tompkins County".

Many listings have no location at all (Tompkins County government, Ithaca Civil Service Portal, some Chamber posts) or a vague one ("United States" from Ithaca College). These are local-source postings, so they will be kept rather than hidden.

## Approach
1. Add one shared location classifier with three outcomes: in-county, remote, out-of-county.
   - In-county town/village/city list: Ithaca, Dryden, Trumansburg, Lansing, Newfield, Groton, Danby, Enfield, Caroline, Ulysses, Freeville, Cayuga Heights, Brooktondale, Slaterville Springs, Etna, McLean, Jacksonville, plus any text containing "Tompkins".
   - Remote keywords: remote, work from home, telecommute, hybrid (hybrid kept as remote-eligible).
   - Out-of-county: matches a known non-Tompkins place (Montour Falls, Cortland, Geneva, New York City, Syracuse, Binghamton, Elmira, Watkins Glen, Owego, Auburn, Rochester, Buffalo, Albany, Horseheads, Waverly, Corning, Bath, Penn Yan, Seneca Falls, Homer, Marathon, Whitney Point, Candor, Spencer, Van Etten, Interlaken, Odessa, Moravia, plus non-NY states).
   - Anything unrecognized (including empty) counts as keep.
2. Apply it in the scraper (`scrape-jobs`) so new out-of-county postings are never inserted, and are deactivated if they were previously active.
3. Apply it on the Employment page as a display-level guard so existing rows are filtered immediately and any future edge case never reaches users.
4. One-time cleanup: deactivate the currently active out-of-county listings (Montour Falls, Cortland, Geneva, New York City) so admin counts and reports match what the public sees.

## Technical notes
- New helper lives in a shared module used by both the edge function and the frontend (mirrored file for the Deno function, matching the existing `normalizeWage` pattern).
- Frontend filter runs before category grouping and counts, so pill counts, pay filter, share/print and pagination all reflect the reduced set.
- Cleanup is a SQL update setting `active = false` on matching `employment_opportunities` rows; no data is deleted.
- Admin dashboard keeps full visibility into all rows, including deactivated ones.
