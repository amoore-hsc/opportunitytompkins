// Shared job-location classifier.
//
// The job board only advertises roles in Tompkins County (plus remote roles
// anywhere). Locations arrive as free text from many scrapers, so we classify
// conservatively: only a *known* out-of-county place is excluded. Empty or
// unrecognized locations are kept, because most of those come from local-only
// sources (Tompkins County government, Ithaca Civil Service, Chamber).

const REMOTE_PATTERNS = [
  "remote",
  "work from home",
  "work-from-home",
  "telecommut",
  "hybrid",
  "virtual",
  "anywhere",
];

// Municipalities inside Tompkins County (towns, villages, hamlets).
const IN_COUNTY = [
  "tompkins",
  "ithaca",
  "dryden",
  "trumansburg",
  "lansing",
  "newfield",
  "groton",
  "danby",
  "enfield",
  "caroline",
  "ulysses",
  "freeville",
  "cayuga heights",
  "brooktondale",
  "slaterville",
  "etna",
  "mclean",
  "jacksonville",
  "varna",
  "forest home",
  "bethel grove",
];

// Known places outside Tompkins County that show up in our sources.
const OUT_OF_COUNTY = [
  "montour falls",
  "cortland",
  "homer",
  "marathon",
  "geneva",
  "new york city",
  "new york, ny",
  "nyc",
  "manhattan",
  "brooklyn",
  "queens",
  "bronx",
  "syracuse",
  "binghamton",
  "endicott",
  "johnson city",
  "vestal",
  "elmira",
  "horseheads",
  "watkins glen",
  "odessa",
  "owego",
  "waverly",
  "candor",
  "spencer",
  "van etten",
  "corning",
  "bath",
  "penn yan",
  "seneca falls",
  "waterloo",
  "auburn",
  "moravia",
  "interlaken",
  "whitney point",
  "rochester",
  "buffalo",
  "albany",
  "utica",
  "oneonta",
  "syracuse, ny",
  "long island",
  "westchester",
  "yonkers",
  "white plains",
  "washington, dc",
  "doha",
  "qatar",
];

// State / region tokens that are definitively not New York.
const NON_NY_REGIONS = [
  " ak", " al", " ar", " az", " ca", " co", " ct", " dc", " de", " fl", " ga",
  " hi", " ia", " id", " il", " in", " ks", " ky", " la", " ma", " md", " me",
  " mi", " mn", " mo", " ms", " mt", " nc", " nd", " ne", " nh", " nj", " nm",
  " nv", " oh", " ok", " or", " pa", " ri", " sc", " sd", " tn", " tx", " ut",
  " va", " vt", " wa", " wi", " wv", " wy",
];

export type JobLocationVerdict = "in-county" | "remote" | "out-of-county" | "unknown";

export function classifyJobLocation(location: string | null | undefined): JobLocationVerdict {
  const raw = (location ?? "").trim().toLowerCase();
  if (!raw) return "unknown";

  if (REMOTE_PATTERNS.some((p) => raw.includes(p))) return "remote";
  if (IN_COUNTY.some((p) => raw.includes(p))) return "in-county";
  if (OUT_OF_COUNTY.some((p) => raw.includes(p))) return "out-of-county";

  // "City, XX" style with a non-NY state abbreviation.
  const tail = raw.replace(/[.,]/g, " ").replace(/\s+/g, " ");
  if (NON_NY_REGIONS.some((r) => tail.endsWith(r) || tail.includes(`${r} `))) {
    return "out-of-county";
  }

  return "unknown";
}

/** True only when the location is a *known* place outside Tompkins County. */
export function isOutsideTompkins(location: string | null | undefined): boolean {
  return classifyJobLocation(location) === "out-of-county";
}
