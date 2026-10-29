// Free, rule-based job categorization (no AI needed).
// Order matters: more specific categories are checked first.

const EMPLOYER_RULES: [RegExp, string][] = [
  [/cayuga health|cayuga medical|schuyler hospital/i, "Healthcare"],
  [/\btc3\b|tompkins cortland community college/i, "Education"],
  [/tompkins county|civil service|city of ithaca|town of /i, "Government"],
];

const TITLE_RULES: [string, string[]][] = [
  ["Healthcare", ["nurse", "nursing", "rn", "lpn", "cna", "medical", "clinical", "clinician", "therapist", "therapy", "pharmac", "patient", "physician", "dental", "radiolog", "phlebotom", "health aide", "surgical", "veterinar", "paramedic", "emt"]],
  ["Education", ["teacher", "professor", "lecturer", "instructor", "tutor", "faculty", "teaching", "postdoc", "librarian", "school", "academic advisor", "curriculum"]],
  ["Technology", ["developer", "software", "programmer", "it ", "systems", "data", "network", "web", "devops", "cyber", "database", "technology", "computing", "engineer"]],
  ["Social Services", ["case manager", "caseworker", "counselor", "social worker", "advocate", "youth", "family", "community", "outreach", "peer", "residential", "direct support"]],
  ["Hospitality", ["cook", "chef", "server", "dining", "dishwasher", "housekeep", "front desk", "barista", "bartender", "food service", "catering", "hotel", "culinary"]],
  ["Trades/Labor", ["mechanic", "electrician", "plumber", "custodian", "custodial", "janitor", "maintenance", "driver", "groundskeeper", "laborer", "carpenter", "hvac", "technician", "warehouse", "mover", "operator", "painter", "cleaner", "facilities"]],
  ["Administrative", ["assistant", "coordinator", "clerk", "office", "receptionist", "accounting", "accountant", "secretary", "administrat", "billing", "payroll", "records", "finance", "human resources", "manager", "director"]],
];

export function categorizeJob(title: string, employer = ""): string {
  const t = ` ${(title || "").toLowerCase()} `;
  for (const [cat, words] of TITLE_RULES) {
    for (const w of words) {
      const re = new RegExp(`\\b${w.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
      if (re.test(t)) return cat;
    }
  }
  for (const [re, cat] of EMPLOYER_RULES) if (re.test(employer)) return cat;
  return "Other";
}
