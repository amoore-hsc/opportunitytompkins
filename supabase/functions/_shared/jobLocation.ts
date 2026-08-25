// Shared job-location classifier (Deno / Edge Functions).
//
// The job board only advertises roles in the target county (plus remote roles
// anywhere). Locations arrive as free text from many scrapers, so we classify
// conservatively: only a *known* out-of-county place is excluded. Empty or
// unrecognized locations are kept, because most of those come from local-only
// sources.
//
// County-specific lists are read from environment variables so each deployment
// can set its own:
//   COUNTY_PLACES          — comma-separated in-county place names (lowercase)
//   OUT_OF_COUNTY_BLOCKLIST — comma-separated out-of-county place names
//   OUT_OF_STATE_REGIONS   — comma-separated non-target state abbreviations
//                            (e.g. " ak, al, az, ca" — leading space matters)

function parseEnvList(name: string): string[] {
  const raw = Deno.env.get(name) || "";
  return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

const REMOTE_PATTERNS = [
  "remote",
  "work from home",
  "work-from-home",
  "telecommut",
  "hybrid",
  "virtual",
  "anywhere",
];

const IN_COUNTY = parseEnvList("COUNTY_PLACES");
const OUT_OF_COUNTY = parseEnvList("OUT_OF_COUNTY_BLOCKLIST");
const NON_TARGET_REGIONS = parseEnvList("OUT_OF_STATE_REGIONS");

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
