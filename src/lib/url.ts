/** Adds https:// when a user types a web address without it (e.g. "example.org"). */
export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}
