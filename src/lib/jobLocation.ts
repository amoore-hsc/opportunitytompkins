// Shared job-location classifier.
//
// The job board only advertises roles in the target county (plus remote roles
// anywhere). Locations arrive as free text from many scrapers, so we classify
// conservatively: only a *known* out-of-county place is excluded. Empty or
// unrecognized locations are kept, because most of those come from local-only
// sources.

import { siteConfig } from "@/config";

const REMOTE_PATTERNS = [
  "remote",
  "work from home",
  "work-from-home",
  "telecommut",
  "hybrid",
  "virtual",
  "anywhere",
];

const IN_COUNTY = siteConfig.countyPlaces.map((p) => p.toLowerCase());
const OUT_OF_COUNTY = siteConfig.outOfCountyBlocklist.map((p) => p.toLowerCase());
const NON_TARGET_REGIONS = siteConfig.outOfStateRegions.map((r) => r.toLowerCase());

export type JobLocationVerdict = "in-county" | "remote" | "out-of-county" | "unknown";

export function classifyJobLocation(location: string | null | undefined): JobLocationVerdict {
  const raw = (location ?? "").trim().toLowerCase();
  if (!raw) return "unknown";

  if (REMOTE_PATTERNS.some((p) => raw.includes(p))) return "remote";
  if (IN_COUNTY.length && IN_COUNTY.some((p) => raw.includes(p))) return "in-county";
  if (OUT_OF_COUNTY.some((p) => raw.includes(p))) return "out-of-county";

  // "City, XX" style with a non-target-state abbreviation.
  const tail = raw.replace(/[.,]/g, " ").replace(/\s+/g, " ");
  if (NON_TARGET_REGIONS.some((r) => tail.endsWith(r) || tail.includes(`${r} `))) {
    return "out-of-county";
  }

  return "unknown";
}

/** True only when the location is a *known* place outside the target county. */
export function isOutsideCounty(location: string | null | undefined): boolean {
  return classifyJobLocation(location) === "out-of-county";
}

/** Backward-compatible alias. */
export const isOutsideTompkins = isOutsideCounty;
