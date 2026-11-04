// Shared wage normalization.
// AI extraction often returns placeholder strings like "Null", "N/A" or
// "Not listed" instead of an actual omission. Those must be stored as NULL so
// the wage-enrichment job can retry them and the UI doesn't render "Null".

const PLACEHOLDERS = new Set([
  "null",
  "nil",
  "none",
  "n/a",
  "na",
  "not listed",
  "not specified",
  "not provided",
  "not available",
  "unspecified",
  "unknown",
  "tbd",
  "-",
  "--",
  "/",
  "$",
]);

export function normalizeWage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (PLACEHOLDERS.has(trimmed.toLowerCase().replace(/[.\s]+$/, ""))) return null;
  return trimmed;
}

// ── Free wage extraction from a job description ───────────────────────────
// Job descriptions (Workday, Oracle HCM, …) usually state pay in prose, e.g.
// "The hiring rate of pay is $23.79 per hour" or "Compensation: $116,000 -
// $123,000". This pulls the first amount that appears shortly after a pay
// keyword, so we don't need a paid scraping service to find it.

const MONEY = String.raw`\$\s?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\$\s?\d+(?:\.\d{1,2})?`;
const SECOND = String.raw`(?:\$\s?)?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|(?:\$\s?)?\d+(?:\.\d{1,2})?`;
const WAGE_RE = new RegExp(
  String.raw`(${MONEY})(?:\s*(?:-|–|—|to)\s*(${SECOND}))?` +
    String.raw`(?:\s*(?:\/|per|an|a)\s*(hour|hr|year|yr|annum|week|month)\b|\s+(hourly|annually|yearly|weekly|monthly)\b)?`,
  "gi",
);
const PAY_KEYWORDS =
  /\b(pay|salary|salaries|compensation|wages?|rate|range|hiring|starting|annual|hourly|stipend)\b/i;

const UNIT_SUFFIX: Record<string, string> = {
  hour: "/hr", hr: "/hr", hourly: "/hr",
  year: "/year", yr: "/year", annum: "/year", annually: "/year", yearly: "/year",
  week: "/week", weekly: "/week",
  month: "/month", monthly: "/month",
};

/** Plain text from an HTML fragment (tags removed, common entities decoded). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#36;|&dollar;/gi, "$")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/[ \t]+/g, " ");
}

/**
 * Returns a display wage like "$23.79/hr" or "$116,000 - $123,000", or null
 * when no amount appears within ~150 characters after a pay keyword.
 */
export function extractWageFromText(htmlOrText: string | null | undefined): string | null {
  if (!htmlOrText) return null;
  const text = htmlToText(htmlOrText);
  for (const m of text.matchAll(WAGE_RE)) {
    const at = m.index ?? 0;
    const before = text.slice(Math.max(0, at - 150), at);
    if (!PAY_KEYWORDS.test(before)) continue;
    const amount = Number(m[1].replace(/[$,\s]/g, ""));
    if (!Number.isFinite(amount) || amount < 7) continue; // skip "$1", "$5 fee", etc.
    const tidy = (s: string) => {
      const t = s.replace(/\s+/g, "");
      return t.startsWith("$") ? t : `$${t}`;
    };
    const unit = (m[3] || m[4] || "").toLowerCase();
    const range = m[2] ? `${tidy(m[1])} - ${tidy(m[2])}` : tidy(m[1]);
    return normalizeWage(`${range}${UNIT_SUFFIX[unit] ?? ""}`);
  }
  return null;
}
