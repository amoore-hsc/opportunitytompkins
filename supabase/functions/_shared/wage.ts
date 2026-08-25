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
